package cl.licitawatch.usuarios.bs;

import cl.licitawatch.common.ApiException;
import cl.licitawatch.common.InternalClient;
import com.fasterxml.jackson.databind.JsonNode;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Component;

import java.time.Instant;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;

import static cl.licitawatch.common.InternalClient.q;

/** Acceso a la capa BD de Usuarios (ms-usuarios-bd) por REST. Las filas llegan tal como están en las tablas del ER. */
@Component
public class UsuariosBd {
    public record UsuarioFila(Long id, String email, String password, String rol, boolean activo, boolean emailVerificado, Instant createdAt, String foto) {}
    public record PerfilFila(Long usuarioId, String tipo, String razonSocial, String rut, String rutPersona, String nombreContacto, String emailContacto, String telefono,
                             Integer rubroId, Integer ciudadId, Integer tamanoEmpresaId, String descripcionEmpresa, String sitioWeb, Instant updatedAt, String nombre, String area) {
        boolean esEmpresa() { return !"ADMIN".equals(tipo); }
        /** Razón social de la empresa o, para el administrador, su nombre. */
        String nombreVisible() { return esEmpresa() ? razonSocial : nombre; }
    }
    public record CatalogoFila(Integer id, String nombre) {}
    public record CiudadFila(Integer id, String nombre, Integer regionId) {}

    private final InternalClient bd; private final String url;
    public UsuariosBd(InternalClient bd, @Value("${lw.urls.bd}") String url) { this.bd = bd; this.url = url; }

    // ---------- usuario ----------
    public UsuarioFila usuario(long id) { return bd.get(url + "/bd/usuarios/" + id, UsuarioFila.class); }
    public List<UsuarioFila> usuarios() { return List.of(bd.get(url + "/bd/usuarios", UsuarioFila[].class)); }
    public Optional<UsuarioFila> porEmail(String email) {
        try { return Optional.of(bd.get(url + "/bd/usuarios/por-email?email=" + q(email.trim()), UsuarioFila.class)); }
        catch (ApiException e) { if (e.getStatus() == HttpStatus.NOT_FOUND) return Optional.empty(); throw e; }
    }
    public boolean emailExiste(String email) { return bd.get(url + "/bd/usuarios/existe?email=" + q(email.trim()), JsonNode.class).path("existe").asBoolean(); }
    public UsuarioFila crear(String email, String passwordHash, String rol, boolean verificado, PerfilFila perfil) {
        Map<String, Object> b = new HashMap<>();
        b.put("email", email); b.put("password", passwordHash); b.put("rol", rol); b.put("emailVerificado", verificado); b.put("perfil", perfil);
        return bd.post(url + "/bd/usuarios", b, UsuarioFila.class);
    }
    /** Cambia solo los campos indicados (los null no se tocan). */
    public UsuarioFila cambiar(long id, Boolean activo, Boolean emailVerificado, String passwordHash) {
        Map<String, Object> b = new HashMap<>();
        b.put("activo", activo); b.put("emailVerificado", emailVerificado); b.put("password", passwordHash);
        return bd.patch(url + "/bd/usuarios/" + id, b, UsuarioFila.class);
    }
    public UsuarioFila foto(long id, String foto) { Map<String, Object> b = new HashMap<>(); b.put("foto", foto); return bd.put(url + "/bd/usuarios/" + id + "/foto", b, UsuarioFila.class); }
    public void eliminar(long id) { bd.delete(url + "/bd/usuarios/" + id); }

    // ---------- perfil ----------
    /** Perfil de la tabla que corresponde al rol (licitador, pyme o administrador). */
    public Optional<PerfilFila> perfil(long usuarioId) {
        try { return Optional.of(bd.get(url + "/bd/perfiles/" + usuarioId, PerfilFila.class)); }
        catch (ApiException e) { if (e.getStatus() == HttpStatus.NOT_FOUND) return Optional.empty(); throw e; }
    }
    public List<Long> pymesPorRubro(int rubroId) { return List.of(bd.get(url + "/bd/pymes/por-rubro/" + rubroId, Long[].class)); }
    public List<PerfilFila> perfiles() { return List.of(bd.get(url + "/bd/perfiles", PerfilFila[].class)); }
    public PerfilFila actualizarPerfil(long usuarioId, PerfilFila cambios) { return bd.put(url + "/bd/perfiles/" + usuarioId, cambios, PerfilFila.class); }
    public boolean rutExiste(String rut) { return bd.get(url + "/bd/perfiles/existe?rut=" + q(rut), JsonNode.class).path("existe").asBoolean(); }
    public boolean rutPersonaExiste(String rut) { return bd.get(url + "/bd/perfiles/existe?rutPersona=" + q(rut), JsonNode.class).path("existe").asBoolean(); }

    /** Razón social (o nombre del administrador); si no tiene perfil, el correo. */
    public String nombre(UsuarioFila u) { return perfil(u.id()).map(PerfilFila::nombreVisible).orElse(u.email()); }

    // ---------- catálogos ----------
    public List<CatalogoFila> rubros() { return List.of(bd.get(url + "/bd/catalogos/rubros", CatalogoFila[].class)); }
    public List<CatalogoFila> regiones() { return List.of(bd.get(url + "/bd/catalogos/regiones", CatalogoFila[].class)); }
    public List<CatalogoFila> tamanos() { return List.of(bd.get(url + "/bd/catalogos/tamanos", CatalogoFila[].class)); }
    public List<CiudadFila> ciudades(Integer regionId) { return List.of(bd.get(url + "/bd/catalogos/ciudades" + (regionId == null ? "" : "?regionId=" + regionId), CiudadFila[].class)); }

    public boolean rubroExiste(Integer id) { return id != null && rubros().stream().anyMatch(c -> c.id().equals(id)); }
    public boolean ciudadExiste(Integer id) { return id != null && ciudades(null).stream().anyMatch(c -> c.id().equals(id)); }
    public boolean tamanoExiste(Integer id) { return id != null && tamanos().stream().anyMatch(c -> c.id().equals(id)); }
}
