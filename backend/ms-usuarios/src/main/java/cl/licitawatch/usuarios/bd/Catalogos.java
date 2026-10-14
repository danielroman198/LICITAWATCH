package cl.licitawatch.usuarios.bd;

import jakarta.persistence.*;

/** Tablas de catálogo del ER: rubro, region, ciudad (region_id FK) y tamano_empresa. */
public final class Catalogos {
    private Catalogos() {}

    @Entity @Table(name = "rubro", uniqueConstraints = @UniqueConstraint(name = "uq_rubro_nombre", columnNames = "nombre"))
    public static class Rubro {
        @Id @GeneratedValue(strategy = GenerationType.IDENTITY) private Integer id;
        @Column(nullable = false) private String nombre;
        public Rubro() {} public Rubro(String n) { nombre = n; }
        public Integer getId() { return id; } public String getNombre() { return nombre; }
    }

    @Entity @Table(name = "region", uniqueConstraints = @UniqueConstraint(name = "uq_region_nombre", columnNames = "nombre"))
    public static class Region {
        @Id @GeneratedValue(strategy = GenerationType.IDENTITY) private Integer id;
        @Column(nullable = false) private String nombre;
        public Region() {} public Region(String n) { nombre = n; }
        public Integer getId() { return id; } public String getNombre() { return nombre; }
    }

    @Entity @Table(name = "ciudad")
    public static class Ciudad {
        @Id @GeneratedValue(strategy = GenerationType.IDENTITY) private Integer id;
        @Column(nullable = false) private String nombre;
        @Column(name = "region_id", nullable = false) private Integer regionId;
        public Ciudad() {} public Ciudad(String n, Integer regionId) { nombre = n; this.regionId = regionId; }
        public Integer getId() { return id; } public String getNombre() { return nombre; } public Integer getRegionId() { return regionId; }
    }

    @Entity @Table(name = "tamano_empresa", uniqueConstraints = @UniqueConstraint(name = "uq_tamano_nombre", columnNames = "nombre"))
    public static class TamanoEmpresa {
        @Id @GeneratedValue(strategy = GenerationType.IDENTITY) private Integer id;
        @Column(nullable = false) private String nombre;
        public TamanoEmpresa() {} public TamanoEmpresa(String n) { nombre = n; }
        public Integer getId() { return id; } public String getNombre() { return nombre; }
    }
}
