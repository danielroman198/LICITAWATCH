package cl.licitawatch.ventas.bs;

import cl.licitawatch.common.ApiException;
import cl.licitawatch.common.InternalClient;
import com.fasterxml.jackson.databind.JsonNode;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import java.time.*;
import java.util.*;
import java.util.stream.Collectors;

/** Reglas de Ventas (planes, vigencia de 30 días, cobro). Los datos los entrega la capa BD (ms-ventas-bd). */
@Service
public class VentasService {
    public record PlanDto(Integer id, String nombre, int precioMensual, int postulacionesMes, String descripcion, List<String> beneficios) {}
    public record SuscripcionDto(Long id, Long usuarioId, PlanDto plan, String estado, Instant fechaInicio, Instant fechaFin, int postulacionesUsadas) {}
    public record VentaDto(Long id, Long usuarioId, String usuarioNombre, String plan, long monto, Instant fecha, String metodo, String estado, String idTransaccion) {}
    public record ResultadoPago(VentaDto venta, SuscripcionDto suscripcion) {}
    // Filas tal como las entrega la capa BD.
    record PlanFila(Integer id, String nombre) {}
    record SuscFila(Long id, Long usuarioId, Integer planId, String plan, String estado) {}
    record VentaFila(Long id, Long suscripcionId, long monto, LocalDate fecha, String idTransaccion, String metodo, String estadoPago) {}
    record CompraFila(SuscFila suscripcion, VentaFila venta) {}

    private static final String[] MESES = {"ene", "feb", "mar", "abr", "may", "jun", "jul", "ago", "sep", "oct", "nov", "dic"};
    private static final int DIAS_VIGENCIA = 30;
    private final PasarelaCliente pasarela; private final InternalClient interno;
    private final String urlBd, urlUsuarios, urlLicitaciones, urlNotif;

    public VentasService(PasarelaCliente pasarela, InternalClient interno, @Value("${lw.urls.bd}") String urlBd, @Value("${lw.urls.usuarios}") String urlUsuarios,
                         @Value("${lw.urls.licitaciones}") String urlLicitaciones, @Value("${lw.urls.notificaciones}") String urlNotif) {
        this.pasarela = pasarela; this.interno = interno; this.urlBd = urlBd; this.urlUsuarios = urlUsuarios; this.urlLicitaciones = urlLicitaciones; this.urlNotif = urlNotif;
    }

    // ---------- acceso a la capa BD ----------
    private List<PlanFila> planesBd() { return List.of(interno.get(urlBd + "/bd/planes", PlanFila[].class)); }
    private List<SuscFila> suscripcionesBd(String filtro) { return List.of(interno.get(urlBd + "/bd/suscripciones" + filtro, SuscFila[].class)); }
    private Optional<SuscFila> activa(long usuarioId) { return suscripcionesBd("?usuarioId=" + usuarioId + "&estado=Activa").stream().findFirst(); }
    private void cambiarEstado(long suscripcionId, String estado) { interno.put(urlBd + "/bd/suscripciones/" + suscripcionId + "/estado", Map.of("estado", estado), JsonNode.class); }
    private List<VentaFila> ventasBd(Collection<Long> suscripcionIds) {
        String q = suscripcionIds == null ? "" : "?suscripcionIds=" + suscripcionIds.stream().map(String::valueOf).collect(Collectors.joining(","));
        if (suscripcionIds != null && suscripcionIds.isEmpty()) return List.of();
        return List.of(interno.get(urlBd + "/bd/ventas" + q, VentaFila[].class));
    }

    private PlanDto dto(PlanFila p) { var i = PlanInfo.de(p.nombre()); return new PlanDto(p.id(), p.nombre(), i.precioMensual(), i.postulacionesMes(), i.descripcion(), i.beneficios()); }
    public List<PlanDto> planes() { return planesBd().stream().map(this::dto).sorted(Comparator.comparing(PlanDto::precioMensual)).toList(); }
    private static Instant inicioDia(LocalDate d) { return d.atStartOfDay(ZoneId.systemDefault()).toInstant(); }

    /** Fecha del último cobro aprobado de una suscripción (la vigencia es de 30 días desde ahí; el ER no guarda fechas en suscripcion). */
    private Optional<LocalDate> ultimoCobro(long suscripcionId) {
        return ventasBd(List.of(suscripcionId)).stream().filter(v -> "Aprobado".equals(v.estadoPago())).map(VentaFila::fecha).max(Comparator.naturalOrder());
    }
    private boolean vigente(SuscFila s) { return ultimoCobro(s.id()).map(f -> !f.plusDays(DIAS_VIGENCIA).isBefore(LocalDate.now())).orElse(false); }

    /** Suscripción vigente; si no hay una Premium activa (o venció), la Pyme está en el plan Estándar. */
    public SuscripcionDto miSuscripcion(long usuarioId) {
        Optional<SuscFila> s = activa(usuarioId);
        if (s.isPresent() && !vigente(s.get())) { cambiarEstado(s.get().id(), "Vencida"); s = Optional.empty(); }
        List<PlanFila> todos = planesBd();
        PlanFila plan = s.map(x -> new PlanFila(x.planId(), x.plan()))
                .orElseGet(() -> todos.stream().filter(p -> "Estándar".equals(p.nombre())).findFirst().orElseThrow(() -> ApiException.noEncontrado("Plan Estándar no encontrado")));
        Optional<LocalDate> cobro = s.flatMap(x -> ultimoCobro(x.id()));
        return new SuscripcionDto(s.map(SuscFila::id).orElse(0L), usuarioId, dto(plan), "Activa", cobro.map(VentasService::inicioDia).orElse(Instant.EPOCH),
                cobro.map(f -> inicioDia(f.plusDays(DIAS_VIGENCIA))).orElse(null), usadas(usuarioId));
    }

    private int usadas(long usuarioId) {
        try { return interno.get(urlLicitaciones + "/internal/postulaciones/usadas?usuarioId=" + usuarioId, JsonNode.class).path("usadas").asInt(); } catch (Exception e) { return 0; }
    }

    /** Cobra a través de ms-ventas-ambassador (pasarela Transbank) y registra plan → suscripción → venta → pago en la capa BD (una transacción allá). */
    public ResultadoPago pagar(long usuarioId, long planId, String metodo, boolean simularRechazo) {
        PlanFila plan = interno.get(urlBd + "/bd/planes/" + planId, PlanFila.class);
        int precio = PlanInfo.de(plan.nombre()).precioMensual();
        if (precio == 0) throw ApiException.invalido("El plan Estándar es gratuito, no requiere pago");
        if (!List.of(interno.get(urlBd + "/bd/metodos-pago", String[].class)).contains(metodo)) throw ApiException.invalido("Método de pago inválido");

        PasarelaCliente.Resultado r = pasarela.cobrar(precio, metodo, "LW-" + usuarioId + "-" + System.currentTimeMillis(), simularRechazo);
        CompraFila c = interno.post(urlBd + "/bd/compras", Map.of("usuarioId", usuarioId, "planId", plan.id(), "metodo", metodo, "idTransaccion", r.idTransaccion(),
                "aprobado", r.aprobado(), "monto", precio), CompraFila.class);

        VentaDto vd = ventaDto(c.venta(), c.suscripcion(), nombreDe(usuarioId));
        if (!r.aprobado()) return new ResultadoPago(vd, null);
        interno.notificar(urlNotif, usuarioId, "Pago confirmado", "Pago confirmado", "Tu suscripción " + plan.nombre() + " está activa. Transacción " + r.idTransaccion() + ".", true);
        return new ResultadoPago(vd, miSuscripcion(usuarioId));
    }

    public SuscripcionDto cancelar(long usuarioId) {
        activa(usuarioId).ifPresent(s -> cambiarEstado(s.id(), "Cancelada"));
        return miSuscripcion(usuarioId);
    }

    private String nombreDe(long usuarioId) {
        try { return interno.get(urlUsuarios + "/internal/usuarios/" + usuarioId + "/resumen", JsonNode.class).path("nombre").asText("Pyme " + usuarioId); } catch (Exception e) { return "Pyme " + usuarioId; }
    }
    private VentaDto ventaDto(VentaFila v, SuscFila s, String nombre) {
        return new VentaDto(v.id(), s.usuarioId(), nombre, s.plan(), v.monto(), inicioDia(v.fecha()), v.metodo(), v.estadoPago(), v.idTransaccion());
    }
    private List<VentaDto> ventaDtos(List<VentaFila> vs) {
        if (vs.isEmpty()) return List.of();
        Map<Long, SuscFila> ss = suscripcionesBd("?ids=" + vs.stream().map(v -> String.valueOf(v.suscripcionId())).distinct().collect(Collectors.joining(",")))
                .stream().collect(Collectors.toMap(SuscFila::id, x -> x));
        Map<Long, String> nombres = new HashMap<>(); List<VentaDto> out = new ArrayList<>();
        for (VentaFila v : vs) { SuscFila s = ss.get(v.suscripcionId()); if (s == null || v.estadoPago() == null) continue;
            out.add(ventaDto(v, s, nombres.computeIfAbsent(s.usuarioId(), this::nombreDe))); }
        return out;
    }

    public List<VentaDto> misPagos(long usuarioId) {
        List<Long> ids = suscripcionesBd("?usuarioId=" + usuarioId).stream().map(SuscFila::id).toList();
        return ids.isEmpty() ? List.of() : ventaDtos(ventasBd(ids));
    }
    public List<VentaDto> todas() { return ventaDtos(ventasBd(null)); }

    /** usuarioId → "Premium" para las Pymes con suscripción pagada vigente. */
    public Map<String, String> planesActivos() {
        Map<String, String> m = new HashMap<>();
        for (SuscFila s : suscripcionesBd("?estado=Activa")) if (vigente(s)) m.put(String.valueOf(s.usuarioId()), s.plan());
        return m;
    }

    public Map<String, Object> resumen() {
        List<VentaDto> ok = todas().stream().filter(v -> "Aprobado".equals(v.estado())).toList();
        YearMonth ahora = YearMonth.now();
        long mes = ok.stream().filter(v -> YearMonth.from(v.fecha().atZone(ZoneId.systemDefault())).equals(ahora)).mapToLong(VentaDto::monto).sum();
        List<Map<String, Object>> porMes = new ArrayList<>();
        for (int i = 5; i >= 0; i--) { YearMonth ym = ahora.minusMonths(i); long t = ok.stream().filter(v -> YearMonth.from(v.fecha().atZone(ZoneId.systemDefault())).equals(ym)).mapToLong(VentaDto::monto).sum(); porMes.add(Map.of("mes", MESES[ym.getMonthValue() - 1], "valor", t)); }
        return Map.of("ingresosMes", mes, "ingresosTotal", ok.stream().mapToLong(VentaDto::monto).sum(), "ingresosPorMes", porMes, "pymesPremium", planesActivos().size());
    }

    /** El historial de ventas y pagos se conserva (REF sin FK); solo se cancela la suscripción vigente. */
    public void eliminarUsuario(long usuarioId) {
        activa(usuarioId).ifPresent(s -> cambiarEstado(s.id(), "Cancelada"));
    }
}
