package cl.licitawatch.ventas.bd;

import jakarta.persistence.*;
import java.math.BigDecimal;
import java.time.LocalDate;

/** Tabla venta (ER): monto es lo realmente cobrado ese día (dato histórico). */
@Entity @Table(name = "venta", indexes = @Index(name = "ix_venta_susc", columnList = "suscripcion_id"))
public class Venta {
    @Id @GeneratedValue(strategy = GenerationType.IDENTITY) private Long id;
    @Column(name = "suscripcion_id", nullable = false) private Long suscripcionId;
    @Column(nullable = false) private BigDecimal monto;
    @Column(nullable = false) private LocalDate fecha = LocalDate.now();
    public Long getId() { return id; } public Long getSuscripcionId() { return suscripcionId; } public void setSuscripcionId(Long v) { suscripcionId = v; }
    public BigDecimal getMonto() { return monto; } public void setMonto(BigDecimal v) { monto = v; } public LocalDate getFecha() { return fecha; } public void setFecha(LocalDate v) { fecha = v; }
}
