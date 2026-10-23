package cl.licitawatch.ventas.bd;

import cl.licitawatch.ventas.bd.Catalogos.*;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.Collection;
import java.util.List;
import java.util.Optional;

public final class Repos {
    private Repos() {}
    public interface PlanRepo extends JpaRepository<PlanSuscripcion, Integer> { Optional<PlanSuscripcion> findByNombre(String n); }
    public interface EstadoSuscripcionRepo extends JpaRepository<EstadoSuscripcion, Integer> { Optional<EstadoSuscripcion> findByNombre(String n); }
    public interface EstadoPagoRepo extends JpaRepository<EstadoPago, Integer> { Optional<EstadoPago> findByNombre(String n); }
    public interface MetodoPagoRepo extends JpaRepository<MetodoPago, Integer> { Optional<MetodoPago> findByNombre(String n); }

    public interface SuscripcionRepo extends JpaRepository<Suscripcion, Long> {
        Optional<Suscripcion> findFirstByUsuarioIdAndEstado_NombreOrderByIdDesc(Long usuarioId, String estado);
        List<Suscripcion> findByEstado_Nombre(String estado);
        List<Suscripcion> findByUsuarioId(Long usuarioId);
    }
    public interface VentaRepo extends JpaRepository<Venta, Long> {
        List<Venta> findBySuscripcionIdInOrderByIdDesc(Collection<Long> suscripcionIds);
        List<Venta> findBySuscripcionId(Long suscripcionId);
        List<Venta> findAllByOrderByIdDesc();
    }
    public interface PagoRepo extends JpaRepository<Pago, Long> { List<Pago> findByVentaIdIn(Collection<Long> ventaIds); }
}
