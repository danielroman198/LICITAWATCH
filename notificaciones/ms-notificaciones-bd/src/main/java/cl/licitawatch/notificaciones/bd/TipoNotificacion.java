package cl.licitawatch.notificaciones.bd;

import jakarta.persistence.*;

/** Catálogo tipo_notificacion (ER): Licitación publicada, Postulación recibida/aprobada/rechazada, Pago confirmado, Mensaje nuevo. */
@Entity @Table(name = "tipo_notificacion", uniqueConstraints = @UniqueConstraint(name = "uq_tipo_notif", columnNames = "nombre"))
public class TipoNotificacion {
    @Id @GeneratedValue(strategy = GenerationType.IDENTITY) private Integer id;
    @Column(nullable = false, length = 60) private String nombre;
    public TipoNotificacion() {} public TipoNotificacion(String n) { nombre = n; }
    public Integer getId() { return id; } public String getNombre() { return nombre; }
}
