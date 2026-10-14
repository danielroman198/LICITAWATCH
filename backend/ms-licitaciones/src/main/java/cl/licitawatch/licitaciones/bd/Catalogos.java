package cl.licitawatch.licitaciones.bd;

import jakarta.persistence.*;

/** Catálogos de la BD Licitaciones (ER): estado_licitacion, estado_postulacion y tipo_archivo. */
public final class Catalogos {
    private Catalogos() {}

    @Entity @Table(name = "estado_licitacion", uniqueConstraints = @UniqueConstraint(name = "uq_estado_lic", columnNames = "nombre"))
    public static class EstadoLicitacion {
        @Id @GeneratedValue(strategy = GenerationType.IDENTITY) private Integer id;
        @Column(nullable = false, length = 30) private String nombre;
        public EstadoLicitacion() {} public EstadoLicitacion(String n) { nombre = n; }
        public Integer getId() { return id; } public String getNombre() { return nombre; }
    }

    @Entity @Table(name = "estado_postulacion", uniqueConstraints = @UniqueConstraint(name = "uq_estado_post", columnNames = "nombre"))
    public static class EstadoPostulacion {
        @Id @GeneratedValue(strategy = GenerationType.IDENTITY) private Integer id;
        @Column(nullable = false, length = 30) private String nombre;
        public EstadoPostulacion() {} public EstadoPostulacion(String n) { nombre = n; }
        public Integer getId() { return id; } public String getNombre() { return nombre; }
    }

    @Entity @Table(name = "tipo_archivo", uniqueConstraints = @UniqueConstraint(name = "uq_tipo_archivo", columnNames = "nombre"))
    public static class TipoArchivo {
        @Id @GeneratedValue(strategy = GenerationType.IDENTITY) private Integer id;
        @Column(nullable = false, length = 30) private String nombre;
        public TipoArchivo() {} public TipoArchivo(String n) { nombre = n; }
        public Integer getId() { return id; } public String getNombre() { return nombre; }
    }
}
