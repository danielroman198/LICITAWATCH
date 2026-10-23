package cl.licitawatch.ventas.bd;

import cl.licitawatch.ventas.bd.Catalogos.*;
import jakarta.persistence.*;

/** Tabla pago (ER): una por venta (venta_id UQ). id_transaccion lo informa la pasarela; el método se guarda aquí. */
@Entity @Table(name = "pago", uniqueConstraints = @UniqueConstraint(name = "uq_pago_venta", columnNames = "venta_id"))
public class Pago {
    @Id @GeneratedValue(strategy = GenerationType.IDENTITY) private Long id;
    @Column(name = "venta_id", nullable = false) private Long ventaId;
    @Column(name = "id_transaccion", nullable = false) private String idTransaccion;
    @ManyToOne(fetch = FetchType.EAGER, optional = false) @JoinColumn(name = "metodo_pago_id", nullable = false) private MetodoPago metodo;
    @ManyToOne(fetch = FetchType.EAGER, optional = false) @JoinColumn(name = "estado_pago_id", nullable = false) private EstadoPago estado;
    public Long getId() { return id; } public Long getVentaId() { return ventaId; } public void setVentaId(Long v) { ventaId = v; }
    public String getIdTransaccion() { return idTransaccion; } public void setIdTransaccion(String v) { idTransaccion = v; }
    public MetodoPago getMetodo() { return metodo; } public void setMetodo(MetodoPago v) { metodo = v; }
    public EstadoPago getEstado() { return estado; } public void setEstado(EstadoPago v) { estado = v; }
}
