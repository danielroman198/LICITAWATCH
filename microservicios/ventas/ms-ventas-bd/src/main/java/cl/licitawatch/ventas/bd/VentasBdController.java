package cl.licitawatch.ventas.bd;

import cl.licitawatch.common.ApiException;
import cl.licitawatch.ventas.bd.Catalogos.*;
import cl.licitawatch.ventas.bd.Repos.*;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.*;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.*;
import java.util.function.Function;
import java.util.stream.Collectors;

/** Capa BD de Ventas: plan_suscripcion, suscripcion, venta, pago y sus catálogos. Solo la llama la capa BS (X-Internal-Key). */
@RestController
@RequestMapping("/bd")
public class VentasBdController {
    public record PlanFila(Integer id, String nombre) {}
    public record SuscFila(Long id, Long usuarioId, Integer planId, String plan, String estado) {}
    /** Venta con su pago (1:1 por venta_id). */
    public record VentaFila(Long id, Long suscripcionId, long monto, LocalDate fecha, String idTransaccion, String metodo, String estadoPago) {}
    public record Estado(String estado) {}
    public record Compra(long usuarioId, int planId, String metodo, String idTransaccion, boolean aprobado, long monto) {}
    public record CompraFila(SuscFila suscripcion, VentaFila venta) {}

    private final PlanRepo planes; private final EstadoSuscripcionRepo estadosSusc; private final EstadoPagoRepo estadosPago; private final MetodoPagoRepo metodos;
    private final SuscripcionRepo suscripciones; private final VentaRepo ventas; private final PagoRepo pagos;

    public VentasBdController(PlanRepo planes, EstadoSuscripcionRepo estadosSusc, EstadoPagoRepo estadosPago, MetodoPagoRepo metodos,
                              SuscripcionRepo suscripciones, VentaRepo ventas, PagoRepo pagos) {
        this.planes = planes; this.estadosSusc = estadosSusc; this.estadosPago = estadosPago; this.metodos = metodos;
        this.suscripciones = suscripciones; this.ventas = ventas; this.pagos = pagos;
    }

    private static PlanFila fila(PlanSuscripcion p) { return new PlanFila(p.getId(), p.getNombre()); }
    private static SuscFila fila(Suscripcion s) { return new SuscFila(s.getId(), s.getUsuarioId(), s.getPlan().getId(), s.getPlan().getNombre(), s.getEstado().getNombre()); }
    private static VentaFila fila(Venta v, Pago p) {
        return new VentaFila(v.getId(), v.getSuscripcionId(), v.getMonto().longValue(), v.getFecha(), p == null ? null : p.getIdTransaccion(),
                p == null ? null : p.getMetodo().getNombre(), p == null ? null : p.getEstado().getNombre());
    }
    private EstadoSuscripcion estSusc(String n) { return estadosSusc.findByNombre(n).orElseThrow(() -> ApiException.invalido("Estado de suscripción inexistente: " + n)); }

    // ---------- catálogos ----------
    @GetMapping("/planes") public List<PlanFila> planes() { return planes.findAll().stream().map(VentasBdController::fila).toList(); }
    @GetMapping("/planes/{id}") public PlanFila plan(@PathVariable int id) { return planes.findById(id).map(VentasBdController::fila).orElseThrow(() -> ApiException.noEncontrado("Plan no encontrado")); }
    @GetMapping("/metodos-pago") public List<String> metodos() { return metodos.findAll().stream().map(MetodoPago::getNombre).toList(); }

    // ---------- suscripcion ----------
    /** Filtros opcionales: usuarioId, estado e ids. Más reciente primero. */
    @GetMapping("/suscripciones")
    public List<SuscFila> suscripciones(@RequestParam(required = false) Long usuarioId, @RequestParam(required = false) String estado, @RequestParam(required = false) List<Long> ids) {
        List<Suscripcion> base = ids != null ? suscripciones.findAllById(ids) : usuarioId != null ? suscripciones.findByUsuarioId(usuarioId)
                : estado != null ? suscripciones.findByEstado_Nombre(estado) : suscripciones.findAll();
        return base.stream().filter(s -> usuarioId == null || s.getUsuarioId().equals(usuarioId)).filter(s -> estado == null || estado.equals(s.getEstado().getNombre()))
                .sorted(Comparator.comparing(Suscripcion::getId).reversed()).map(VentasBdController::fila).toList();
    }

    @PutMapping("/suscripciones/{id}/estado") @Transactional
    public SuscFila cambiarEstado(@PathVariable long id, @RequestBody Estado e) {
        Suscripcion s = suscripciones.findById(id).orElseThrow(() -> ApiException.noEncontrado("Suscripción no encontrada"));
        s.setEstado(estSusc(e.estado()));
        return fila(s);
    }

    /**
     * Cadena del ER en una sola transacción: suscripción → venta → pago. Si el cobro fue aprobado, la suscripción activa anterior pasa a
     * 'Vencida' y la nueva queda 'Activa'; si fue rechazado, la nueva queda 'Cancelada' y el pago 'Rechazado' (queda el rastro).
     */
    @PostMapping("/compras") @Transactional
    public CompraFila comprar(@RequestBody Compra c) {
        PlanSuscripcion plan = planes.findById(c.planId()).orElseThrow(() -> ApiException.noEncontrado("Plan no encontrado"));
        MetodoPago mp = metodos.findByNombre(c.metodo()).orElseThrow(() -> ApiException.invalido("Método de pago inválido"));
        if (c.aprobado()) suscripciones.findFirstByUsuarioIdAndEstado_NombreOrderByIdDesc(c.usuarioId(), "Activa").ifPresent(x -> x.setEstado(estSusc("Vencida")));
        Suscripcion s = new Suscripcion();
        s.setUsuarioId(c.usuarioId()); s.setPlan(plan); s.setEstado(estSusc(c.aprobado() ? "Activa" : "Cancelada"));
        s = suscripciones.save(s);
        Venta v = new Venta(); v.setSuscripcionId(s.getId()); v.setMonto(BigDecimal.valueOf(c.monto())); v = ventas.save(v);
        Pago p = new Pago(); p.setVentaId(v.getId()); p.setIdTransaccion(c.idTransaccion()); p.setMetodo(mp);
        p.setEstado(estadosPago.findByNombre(c.aprobado() ? "Aprobado" : "Rechazado").orElseThrow()); p = pagos.save(p);
        return new CompraFila(fila(s), fila(v, p));
    }

    // ---------- venta + pago ----------
    /** Ventas (con su pago) de esas suscripciones, o todas si no se indican. Más reciente primero. */
    @GetMapping("/ventas")
    public List<VentaFila> ventas(@RequestParam(required = false) List<Long> suscripcionIds) {
        List<Venta> vs = suscripcionIds == null ? ventas.findAllByOrderByIdDesc() : suscripcionIds.isEmpty() ? List.of() : ventas.findBySuscripcionIdInOrderByIdDesc(suscripcionIds);
        if (vs.isEmpty()) return List.of();
        Map<Long, Pago> ps = pagos.findByVentaIdIn(vs.stream().map(Venta::getId).toList()).stream().collect(Collectors.toMap(Pago::getVentaId, Function.identity()));
        return vs.stream().map(v -> fila(v, ps.get(v.getId()))).toList();
    }

    /** Compra ya registrada con ese id de transacción (orden de compra de Webpay); lista vacía si no hay. Evita registrar dos veces la misma confirmación. */
    @GetMapping("/compras/transaccion/{idTransaccion}")
    public List<CompraFila> compraPorTransaccion(@PathVariable String idTransaccion) {
        return pagos.findFirstByIdTransaccion(idTransaccion).flatMap(p -> ventas.findById(p.getVentaId())
                .flatMap(v -> suscripciones.findById(v.getSuscripcionId()).map(s -> new CompraFila(fila(s), fila(v, p))))).stream().toList();
    }
}
