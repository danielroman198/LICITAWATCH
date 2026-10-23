package cl.licitawatch.licitaciones.bd;

import cl.licitawatch.licitaciones.bd.Catalogos.EstadoPostulacion;
import jakarta.persistence.*;
import java.time.Instant;
import java.time.LocalDate;

/** Tabla postulacion (ER). licitacion_id es FK real; pyme_id es REF a Usuarios. */
@Entity @Table(name = "postulacion", uniqueConstraints = @UniqueConstraint(name = "uq_post_lic_pyme", columnNames = {"licitacion_id", "pyme_id"}),
        indexes = @Index(name = "ix_post_pyme", columnList = "pyme_id"))
public class Postulacion {
    @Id @GeneratedValue(strategy = GenerationType.IDENTITY) private Long id;
    @Column(name = "licitacion_id", nullable = false) private Long licitacionId;
    @Column(name = "pyme_id", nullable = false) private Long pymeId;
    @Column(length = 2000) private String mensaje;
    @Column(name = "fecha_postulacion", nullable = false) private LocalDate fechaPostulacion = LocalDate.now();
    @ManyToOne(fetch = FetchType.EAGER, optional = false) @JoinColumn(name = "estado_postulacion_id", nullable = false) private EstadoPostulacion estado;
    @Column(name = "updated_at", nullable = false) private Instant updatedAt = Instant.now();

    public Long getId() { return id; } public Long getLicitacionId() { return licitacionId; } public void setLicitacionId(Long v) { licitacionId = v; }
    public Long getPymeId() { return pymeId; } public void setPymeId(Long v) { pymeId = v; }
    public String getMensaje() { return mensaje; } public void setMensaje(String v) { mensaje = v; }
    public LocalDate getFechaPostulacion() { return fechaPostulacion; }
    public EstadoPostulacion getEstado() { return estado; } public void setEstado(EstadoPostulacion v) { estado = v; updatedAt = Instant.now(); }
    public Instant getUpdatedAt() { return updatedAt; }
}
