package cl.licitawatch.ventas.bd;

import jakarta.persistence.*;

/** Catálogos de la BD Ventas (ER): plan_suscripcion, estado_suscripcion, estado_pago y metodo_pago. */
public final class Catalogos {
    private Catalogos() {}

    @Entity @Table(name = "plan_suscripcion", uniqueConstraints = @UniqueConstraint(name = "uq_plan_nombre", columnNames = "nombre"))
    public static class PlanSuscripcion {
        @Id @GeneratedValue(strategy = GenerationType.IDENTITY) private Integer id;
        @Column(nullable = false, length = 30) private String nombre;
        public PlanSuscripcion() {} public PlanSuscripcion(String n) { nombre = n; }
        public Integer getId() { return id; } public String getNombre() { return nombre; }
    }

    @Entity @Table(name = "estado_suscripcion", uniqueConstraints = @UniqueConstraint(name = "uq_estado_susc", columnNames = "nombre"))
    public static class EstadoSuscripcion {
        @Id @GeneratedValue(strategy = GenerationType.IDENTITY) private Integer id;
        @Column(nullable = false, length = 30) private String nombre;
        public EstadoSuscripcion() {} public EstadoSuscripcion(String n) { nombre = n; }
        public Integer getId() { return id; } public String getNombre() { return nombre; }
    }

    @Entity @Table(name = "estado_pago", uniqueConstraints = @UniqueConstraint(name = "uq_estado_pago", columnNames = "nombre"))
    public static class EstadoPago {
        @Id @GeneratedValue(strategy = GenerationType.IDENTITY) private Integer id;
        @Column(nullable = false, length = 30) private String nombre;
        public EstadoPago() {} public EstadoPago(String n) { nombre = n; }
        public Integer getId() { return id; } public String getNombre() { return nombre; }
    }

    @Entity @Table(name = "metodo_pago", uniqueConstraints = @UniqueConstraint(name = "uq_metodo_pago", columnNames = "nombre"))
    public static class MetodoPago {
        @Id @GeneratedValue(strategy = GenerationType.IDENTITY) private Integer id;
        @Column(nullable = false, length = 30) private String nombre;
        public MetodoPago() {} public MetodoPago(String n) { nombre = n; }
        public Integer getId() { return id; } public String getNombre() { return nombre; }
    }
}
