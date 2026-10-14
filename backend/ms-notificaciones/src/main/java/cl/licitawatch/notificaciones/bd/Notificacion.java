package cl.licitawatch.notificaciones.bd;

import jakarta.persistence.*;
import java.time.Instant;

/** Tabla notificacion (ER): id, usuario_id (REF), tipo_notificacion_id (FK), canal ('email'), created_at. */
@Entity @Table(name = "notificacion", indexes = @Index(name = "ix_notif_usuario", columnList = "usuario_id"))
public class Notificacion {
    @Id @GeneratedValue(strategy = GenerationType.IDENTITY) private Long id;
    @Column(name = "usuario_id", nullable = false) private Long usuarioId;
    @ManyToOne(fetch = FetchType.EAGER, optional = false) @JoinColumn(name = "tipo_notificacion_id", nullable = false) private TipoNotificacion tipo;
    @Column(nullable = false, length = 20) private String canal = "email";
    @Column(name = "created_at", nullable = false) private Instant createdAt = Instant.now();
    public Long getId() { return id; } public Long getUsuarioId() { return usuarioId; } public void setUsuarioId(Long v) { usuarioId = v; }
    public TipoNotificacion getTipo() { return tipo; } public void setTipo(TipoNotificacion v) { tipo = v; }
    public String getCanal() { return canal; } public Instant getCreatedAt() { return createdAt; }
}
