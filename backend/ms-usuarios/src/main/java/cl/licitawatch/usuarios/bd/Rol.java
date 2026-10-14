package cl.licitawatch.usuarios.bd;

import jakarta.persistence.*;

/** Tabla rol (ER): LICITADOR | PYME | ADMIN. */
@Entity @Table(name = "rol", uniqueConstraints = @UniqueConstraint(name = "uq_rol_nombre", columnNames = "nombre"))
public class Rol {
    @Id @GeneratedValue(strategy = GenerationType.IDENTITY) private Integer id;
    @Column(nullable = false, length = 30) private String nombre;
    public Rol() {}
    public Rol(String nombre) { this.nombre = nombre; }
    public Integer getId() { return id; } public String getNombre() { return nombre; }
}
