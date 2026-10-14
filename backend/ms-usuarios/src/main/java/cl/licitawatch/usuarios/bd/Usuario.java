package cl.licitawatch.usuarios.bd;

import jakarta.persistence.*;
import java.time.Instant;

/** Tabla usuario (ER): id, email UQ, password (bcrypt), rol_id FK, activo, created_at. */
@Entity @Table(name = "usuario", uniqueConstraints = @UniqueConstraint(name = "uq_usuario_email", columnNames = "email"))
public class Usuario {
    @Id @GeneratedValue(strategy = GenerationType.IDENTITY) private Long id;
    @Column(nullable = false, length = 160) private String email;
    @Column(nullable = false) private String password;
    @ManyToOne(fetch = FetchType.EAGER, optional = false) @JoinColumn(name = "rol_id", nullable = false) private Rol rol;
    @Column(nullable = false) private boolean activo = true;
    @Column(name = "created_at", nullable = false) private Instant createdAt = Instant.now();

    public Long getId() { return id; } public void setId(Long id) { this.id = id; }
    public String getEmail() { return email; } public void setEmail(String email) { this.email = email; }
    public String getPassword() { return password; } public void setPassword(String p) { this.password = p; }
    public Rol getRol() { return rol; } public void setRol(Rol rol) { this.rol = rol; }
    public String getRolNombre() { return rol.getNombre(); }
    public boolean isActivo() { return activo; } public void setActivo(boolean activo) { this.activo = activo; }
    public Instant getCreatedAt() { return createdAt; } public void setCreatedAt(Instant c) { this.createdAt = c; }
}
