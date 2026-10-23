package cl.licitawatch.ventas.bd;

import cl.licitawatch.ventas.bd.Catalogos.*;
import jakarta.persistence.*;

/** Tabla suscripcion (ER): usuario_id es REF a Usuarios; plan_id y estado_suscripcion_id son FK. */
@Entity @Table(name = "suscripcion", indexes = @Index(name = "ix_susc_usuario", columnList = "usuario_id"))
public class Suscripcion {
    @Id @GeneratedValue(strategy = GenerationType.IDENTITY) private Long id;
    @Column(name = "usuario_id", nullable = false) private Long usuarioId;
    @ManyToOne(fetch = FetchType.EAGER, optional = false) @JoinColumn(name = "plan_id", nullable = false) private PlanSuscripcion plan;
    @ManyToOne(fetch = FetchType.EAGER, optional = false) @JoinColumn(name = "estado_suscripcion_id", nullable = false) private EstadoSuscripcion estado;
    public Long getId() { return id; } public Long getUsuarioId() { return usuarioId; } public void setUsuarioId(Long v) { usuarioId = v; }
    public PlanSuscripcion getPlan() { return plan; } public void setPlan(PlanSuscripcion v) { plan = v; }
    public EstadoSuscripcion getEstado() { return estado; } public void setEstado(EstadoSuscripcion v) { estado = v; }
}
