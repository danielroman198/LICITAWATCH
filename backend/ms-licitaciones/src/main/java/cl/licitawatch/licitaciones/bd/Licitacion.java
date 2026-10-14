package cl.licitawatch.licitaciones.bd;

import cl.licitawatch.licitaciones.bd.Catalogos.*;
import jakarta.persistence.*;
import java.math.BigDecimal;
import java.time.Instant;
import java.time.LocalDate;

/** Tabla licitacion (ER). licitador_id, rubro_id y region_id son REF a Usuarios (sin FK). */
@Entity @Table(name = "licitacion", indexes = {@Index(name = "ix_lic_licitador", columnList = "licitador_id"), @Index(name = "ix_lic_estado", columnList = "estado_licitacion_id")})
public class Licitacion {
    @Id @GeneratedValue(strategy = GenerationType.IDENTITY) private Long id;
    @Column(name = "licitador_id", nullable = false) private Long licitadorId;
    @Column(nullable = false, length = 160) private String titulo;
    @Column(nullable = false, length = 4000) private String descripcion;
    @Column(name = "rubro_id", nullable = false) private Integer rubroId;
    @Column(name = "region_id", nullable = false) private Integer regionId;
    @Column(name = "presupuesto_min") private BigDecimal presupuestoMin;
    @Column(name = "presupuesto_max") private BigDecimal presupuestoMax;
    @Column(name = "max_postulantes") private Integer maxPostulantes;
    @Column(name = "imagen_url", columnDefinition = "TEXT") private String imagenUrl;
    @Column(name = "archivo_url", columnDefinition = "TEXT") private String archivoUrl;
    @Column(name = "archivo_nombre") private String archivoNombre;
    @ManyToOne(fetch = FetchType.EAGER) @JoinColumn(name = "tipo_archivo_id") private TipoArchivo tipoArchivo;
    @Column(name = "fecha_cierre", nullable = false) private LocalDate fechaCierre;
    @ManyToOne(fetch = FetchType.EAGER, optional = false) @JoinColumn(name = "estado_licitacion_id", nullable = false) private EstadoLicitacion estado;
    @Column(name = "created_at", nullable = false) private Instant createdAt = Instant.now();

    public Long getId() { return id; } public Long getLicitadorId() { return licitadorId; } public void setLicitadorId(Long v) { licitadorId = v; }
    public String getTitulo() { return titulo; } public void setTitulo(String v) { titulo = v; } public String getDescripcion() { return descripcion; } public void setDescripcion(String v) { descripcion = v; }
    public Integer getRubroId() { return rubroId; } public void setRubroId(Integer v) { rubroId = v; } public Integer getRegionId() { return regionId; } public void setRegionId(Integer v) { regionId = v; }
    public BigDecimal getPresupuestoMin() { return presupuestoMin; } public void setPresupuestoMin(BigDecimal v) { presupuestoMin = v; }
    public BigDecimal getPresupuestoMax() { return presupuestoMax; } public void setPresupuestoMax(BigDecimal v) { presupuestoMax = v; }
    public Integer getMaxPostulantes() { return maxPostulantes; } public void setMaxPostulantes(Integer v) { maxPostulantes = v; }
    public String getImagenUrl() { return imagenUrl; } public void setImagenUrl(String v) { imagenUrl = v; }
    public String getArchivoUrl() { return archivoUrl; } public void setArchivoUrl(String v) { archivoUrl = v; }
    public String getArchivoNombre() { return archivoNombre; } public void setArchivoNombre(String v) { archivoNombre = v; }
    public TipoArchivo getTipoArchivo() { return tipoArchivo; } public void setTipoArchivo(TipoArchivo v) { tipoArchivo = v; }
    public LocalDate getFechaCierre() { return fechaCierre; } public void setFechaCierre(LocalDate v) { fechaCierre = v; }
    public EstadoLicitacion getEstado() { return estado; } public void setEstado(EstadoLicitacion v) { estado = v; }
    public Instant getCreatedAt() { return createdAt; }
}
