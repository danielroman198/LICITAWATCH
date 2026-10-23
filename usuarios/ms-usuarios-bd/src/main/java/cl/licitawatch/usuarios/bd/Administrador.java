package cl.licitawatch.usuarios.bd;

import jakarta.persistence.*;

/** Tabla administrador (ER): id, usuario_id FK UQ, nombre, area. */
@Entity @Table(name = "administrador", uniqueConstraints = @UniqueConstraint(name = "uq_admin_usuario", columnNames = "usuario_id"))
public class Administrador {
    @Id @GeneratedValue(strategy = GenerationType.IDENTITY) private Long id;
    @Column(name = "usuario_id", nullable = false) private Long usuarioId;
    @Column(nullable = false) private String nombre;
    private String area;
    public Long getId() { return id; }
    public Long getUsuarioId() { return usuarioId; } public void setUsuarioId(Long v) { usuarioId = v; }
    public String getNombre() { return nombre; } public void setNombre(String v) { nombre = v; }
    public String getArea() { return area; } public void setArea(String v) { area = v; }
}
