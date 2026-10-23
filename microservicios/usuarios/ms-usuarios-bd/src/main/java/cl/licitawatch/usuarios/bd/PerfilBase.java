package cl.licitawatch.usuarios.bd;

import jakarta.persistence.*;
import java.time.Instant;

/** Columnas comunes de licitador y pyme (ER). El RUT (empresa y persona) y el correo de acceso no son editables. */
@MappedSuperclass
public abstract class PerfilBase {
    @Id @GeneratedValue(strategy = GenerationType.IDENTITY) private Long id;
    @Column(name = "usuario_id", nullable = false) private Long usuarioId;
    @Column(name = "razon_social", nullable = false) private String razonSocial;
    @Column(nullable = false, length = 12) private String rut;                       // normalizado: 76123456K
    @Column(name = "rut_persona", nullable = false, length = 12) private String rutPersona;           // RUT de la persona de contacto, normalizado
    @Column(name = "nombre_contacto", nullable = false) private String nombreContacto;
    @Column(name = "email_contacto", nullable = false) private String emailContacto;
    @Column(nullable = false, length = 20) private String telefono;
    @Column(name = "rubro_id", nullable = false) private Integer rubroId;
    @Column(name = "ciudad_id", nullable = false) private Integer ciudadId;
    @Column(name = "descripcion_empresa", nullable = false, length = 2000) private String descripcionEmpresa;
    @Column(name = "sitio_web") private String sitioWeb;
    @Column(name = "updated_at", nullable = false) private Instant updatedAt = Instant.now();

    public Long getId() { return id; }
    public Long getUsuarioId() { return usuarioId; } public void setUsuarioId(Long v) { usuarioId = v; }
    public String getRazonSocial() { return razonSocial; } public void setRazonSocial(String v) { razonSocial = v; }
    public String getRut() { return rut; } public void setRut(String v) { rut = v; }
    public String getRutPersona() { return rutPersona; } public void setRutPersona(String v) { rutPersona = v; }
    public String getNombreContacto() { return nombreContacto; } public void setNombreContacto(String v) { nombreContacto = v; }
    public String getEmailContacto() { return emailContacto; } public void setEmailContacto(String v) { emailContacto = v; }
    public String getTelefono() { return telefono; } public void setTelefono(String v) { telefono = v; }
    public Integer getRubroId() { return rubroId; } public void setRubroId(Integer v) { rubroId = v; }
    public Integer getCiudadId() { return ciudadId; } public void setCiudadId(Integer v) { ciudadId = v; }
    public String getDescripcionEmpresa() { return descripcionEmpresa; } public void setDescripcionEmpresa(String v) { descripcionEmpresa = v; }
    public String getSitioWeb() { return sitioWeb; } public void setSitioWeb(String v) { sitioWeb = v; }
    public Instant getUpdatedAt() { return updatedAt; } public void setUpdatedAt(Instant v) { updatedAt = v; }
    public Integer getTamanoEmpresaId() { return null; }
}
