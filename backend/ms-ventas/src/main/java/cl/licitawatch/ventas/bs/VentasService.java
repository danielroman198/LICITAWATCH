package cl.licitawatch.ventas.bs;

import cl.licitawatch.common.ApiException;
import cl.licitawatch.common.InternalClient;
import cl.licitawatch.ventas.ambassador.PasarelaPago;
import cl.licitawatch.ventas.bd.*;
import cl.licitawatch.ventas.bd.Repos.*;
import com.fasterxml.jackson.databind.JsonNode;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.*;
import java.util.*;
import java.util.stream.Collectors;
import cl.licitawatch.ventas.bd.Catalogos.*;

@Service
public class VentasService {
    public record PlanDto(Integer id, String nombre, int precioMensual, int postulacionesMes, String descripcion, List<String> beneficios) {}
    public record SuscripcionDto(Long id, Long usuarioId, PlanDto plan, String estado, Instant fechaInicio, Instant fechaFin, int postulacionesUsadas) {}
    public record VentaDto(Long id, Long usuarioId, String usuarioNombre, String plan, long monto, Instant fecha, String metodo, String estado, String idTransaccion) {}
    public record ResultadoPago(VentaDto venta, SuscripcionDto suscripcion) {}

    private static final String[] MESES = {"ene", "feb", "mar", "abr", "may", "jun", "jul", "ago", "sep", "oct", "nov", "dic"};
    private static final int DIAS_VIGENCIA = 30;
    private final PlanRepo planes; private final EstadoSuscripcionRepo estadosSusc; private final EstadoPagoRepo estadosPago; private final MetodoPagoRepo metodos;
    private final SuscripcionRepo suscripciones; private final VentaRepo ventas; private final PagoRepo pagos; private final PasarelaPago pasarela; private final InternalClient interno;
    private final String urlUsuarios, urlLicitaciones, urlNotif;

    public VentasService(PlanRepo planes, EstadoSuscripcionRepo estadosSusc, EstadoPagoRepo estadosPago, MetodoPagoRepo metodos, SuscripcionRepo suscripciones, VentaRepo ventas,
                         PagoRepo pagos, PasarelaPago pasarela, InternalClient interno, @Value("${lw.urls.usuarios}") String urlUsuarios,
                         @Value("${lw.urls.licitaciones}") String urlLicitaciones, @Value("${lw.urls.notificaciones}") String urlNotif) {
        this.planes = planes; this.estadosSusc = estadosSusc; this.estadosPago = estadosPago; this.metodos = metodos; this.suscripciones = suscripciones; this.ventas = ventas;
        this.pagos = pagos; this.pasarela = pasarela; this.interno = interno; this.urlUsuarios = urlUsuarios; this.urlLicitaciones = urlLicitaciones; this.urlNotif = urlNotif;
    }

    private PlanDto dto(PlanSuscripcion p) { var i = PlanInfo.de(p.getNombre()); return new PlanDto(p.getId(), p.getNombre(), i.precioMensual(), i.postulacionesMes(), i.descripcion(), i.beneficios()); }
    public List<PlanDto> planes() { return planes.findAll().stream().map(this::dto).sorted(Comparator.comparing(PlanDto::precioMensual)).toList(); }
    private static Instant inicioDia(LocalDate d) { return d.atStartOfDay(ZoneId.systemDefault()).toInstant(); }

    /** Fecha del último cobro aprobado de una suscripción (la vigencia es de 30 días desde ahí; el ER no guarda fechas en suscripcion). */
    private Optional<LocalDate> ultimoCobro(long suscripcionId) {
        List<Venta> vs = ventas.findBySuscripcionId(suscripcionId);
        if (vs.isEmpty()) return Optional.empty();
        Set<Long> aprobadas = pagos.findByVentaIdIn(vs.stream().map(Venta::getId).toList()).stream().filter(p -> "Aprobado".equals(p.getEstado().getNombre())).map(Pago::getVentaId).collect(Collectors.toSet());
        return vs.stream().filter(v -> aprobadas.contains(v.getId())).map(Venta::getFecha).max(Comparator.naturalOrder());
    }

    private boolean vigente(Suscripcion s) { return ultimoCobro(s.getId()).map(f -> !f.plusDays(DIAS_VIGENCIA).isBefore(LocalDate.now())).orElse(false); }

    /** Suscripción vigente; si no hay una Premium activa (o venció), la Pyme está en el plan Estándar. */
    @Transactional
    public SuscripcionDto miSuscripcion(long usuarioId) {
        Optional<Suscripcion> s = suscripciones.findFirstByUsuarioIdAndEstado_NombreOrderByIdDesc(usuarioId, "Activa");
        if (s.isPresent() && !vigente(s.get())) { s.get().setEstado(estSusc("Vencida")); s = Optional.empty(); }
        PlanSuscripcion plan = s.map(Suscripcion::getPlan).orElseGet(() -> planes.findByNombre("Estándar").orElseThrow());
        Optional<LocalDate> cobro = s.flatMap(x -> ultimoCobro(x.getId()));
        return new SuscripcionDto(s.map(Suscripcion::getId).orElse(0L), usuarioId, dto(plan), "Activa", cobro.map(VentasService::inicioDia).orElse(Instant.EPOCH),
                cobro.map(f -> inicioDia(f.plusDays(DIAS_VIGENCIA))).orElse(null), usadas(usuarioId));
    }

    private int usadas(long usuarioId) {
        try { return interno.get(urlLicitaciones + "/internal/postulaciones/usadas?usuarioId=" + usuarioId, JsonNode.class).path("usadas").asInt(); } catch (Exception e) { return 0; }
    }
    private EstadoSuscripcion estSusc(String n) { return estadosSusc.findByNombre(n).orElseThrow(() -> ApiException.invalido("Estado de suscripción inexistente")); }

    /** Cadena del ER: plan → suscripción → venta → pago. Un cobro rechazado deja suscripción 'Cancelada' y pago 'Rechazado' (queda el rastro). */
    @Transactional
    public ResultadoPago pagar(long usuarioId, long planId, String metodo, boolean simularRechazo) {
        PlanSuscripcion plan = planes.findById((int) planId).orElseThrow(() -> ApiException.noEncontrado("Plan no encontrado"));
        int precio = PlanInfo.de(plan.getNombre()).precioMensual();
        if (precio == 0) throw ApiException.invalido("El plan Estándar es gratuito, no requiere pago");
        MetodoPago mp = metodos.findByNombre(metodo).orElseThrow(() -> ApiException.invalido("Método de pago inválido"));

        PasarelaPago.Resultado r = pasarela.cobrar(precio, metodo, "LW-" + usuarioId + "-" + System.currentTimeMillis(), simularRechazo);
        if (r.aprobado()) suscripciones.findFirstByUsuarioIdAndEstado_NombreOrderByIdDesc(usuarioId, "Activa").ifPresent(x -> x.setEstado(estSusc("Vencida")));

        Suscripcion s = new Suscripcion();
        s.setUsuarioId(usuarioId); s.setPlan(plan); s.setEstado(estSusc(r.aprobado() ? "Activa" : "Cancelada"));
        s = suscripciones.save(s);
        Venta v = new Venta(); v.setSuscripcionId(s.getId()); v.setMonto(BigDecimal.valueOf(precio)); v = ventas.save(v);
        Pago p = new Pago(); p.setVentaId(v.getId()); p.setIdTransaccion(r.idTransaccion()); p.setMetodo(mp);
        p.setEstado(estadosPago.findByNombre(r.aprobado() ? "Aprobado" : "Rechazado").orElseThrow()); p = pagos.save(p);

        VentaDto vd = ventaDto(v, s, p, nombreDe(usuarioId));
        if (!r.aprobado()) return new ResultadoPago(vd, null);
        interno.notificar(urlNotif, usuarioId, "Pago confirmado", "Pago confirmado", "Tu suscripción " + plan.getNombre() + " está activa. Transacción " + r.idTransaccion() + ".", true);
        return new ResultadoPago(vd, miSuscripcion(usuarioId));
    }

    @Transactional
    public SuscripcionDto cancelar(long usuarioId) {
        suscripciones.findFirstByUsuarioIdAndEstado_NombreOrderByIdDesc(usuarioId, "Activa").ifPresent(s -> s.setEstado(estSusc("Cancelada")));
        return miSuscripcion(usuarioId);
    }

    private String nombreDe(long usuarioId) {
        try { return interno.get(urlUsuarios + "/internal/usuarios/" + usuarioId + "/resumen", JsonNode.class).path("nombre").asText("Pyme " + usuarioId); } catch (Exception e) { return "Pyme " + usuarioId; }
    }
    private VentaDto ventaDto(Venta v, Suscripcion s, Pago p, String nombre) {
        return new VentaDto(v.getId(), s.getUsuarioId(), nombre, s.getPlan().getNombre(), v.getMonto().longValue(), inicioDia(v.getFecha()), p.getMetodo().getNombre(), p.getEstado().getNombre(), p.getIdTransaccion());
    }
    private List<VentaDto> ventaDtos(List<Venta> vs) {
        if (vs.isEmpty()) return List.of();
        Map<Long, Suscripcion> ss = suscripciones.findAllById(vs.stream().map(Venta::getSuscripcionId).collect(Collectors.toSet())).stream().collect(Collectors.toMap(Suscripcion::getId, x -> x));
        Map<Long, Pago> ps = pagos.findByVentaIdIn(vs.stream().map(Venta::getId).toList()).stream().collect(Collectors.toMap(Pago::getVentaId, x -> x));
        Map<Long, String> nombres = new HashMap<>(); List<VentaDto> out = new ArrayList<>();
        for (Venta v : vs) { Suscripcion s = ss.get(v.getSuscripcionId()); Pago p = ps.get(v.getId()); if (s == null || p == null) continue;
            out.add(ventaDto(v, s, p, nombres.computeIfAbsent(s.getUsuarioId(), this::nombreDe))); }
        return out;
    }

    public List<VentaDto> misPagos(long usuarioId) {
        List<Long> ids = suscripciones.findByUsuarioId(usuarioId).stream().map(Suscripcion::getId).toList();
        return ids.isEmpty() ? List.of() : ventaDtos(ventas.findBySuscripcionIdInOrderByIdDesc(ids));
    }
    public List<VentaDto> todas() { return ventaDtos(ventas.findAllByOrderByIdDesc()); }

    /** usuarioId → "Premium" para las Pymes con suscripción pagada vigente. */
    public Map<String, String> planesActivos() {
        Map<String, String> m = new HashMap<>();
        for (Suscripcion s : suscripciones.findByEstado_Nombre("Activa")) if (vigente(s)) m.put(String.valueOf(s.getUsuarioId()), s.getPlan().getNombre());
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

    @Transactional
    public void eliminarUsuario(long usuarioId) {
        // El historial de ventas y pagos se conserva (REF sin FK); solo se cancela la suscripción vigente.
        suscripciones.findFirstByUsuarioIdAndEstado_NombreOrderByIdDesc(usuarioId, "Activa").ifPresent(s -> s.setEstado(estSusc("Cancelada")));
    }
}
