package cl.licitawatch.usuarios.bd;

import cl.licitawatch.common.ApiException;
import cl.licitawatch.usuarios.bd.Catalogos.*;
import cl.licitawatch.usuarios.bd.Repos.*;
import org.springframework.http.HttpStatus;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.*;

import java.time.Instant;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.Optional;

/** Capa BD de Usuarios: usuario, rol, licitador, pyme, administrador y catálogos. Solo la llama la capa BS (X-Internal-Key). */
@RestController
@RequestMapping("/bd")
public class UsuariosBdController {
    /** password = hash bcrypt (lo calcula la capa BS; aquí nunca llega la clave en texto plano). */
    public record UsuarioFila(Long id, String email, String password, String rol, boolean activo, boolean emailVerificado, Instant createdAt, String foto) {}
    /** Perfil de la tabla que corresponde al rol. tipo = LICITADOR | PYME | ADMIN; nombre y area solo aplican al administrador. */
    public record PerfilFila(Long usuarioId, String tipo, String razonSocial, String rut, String rutPersona, String nombreContacto, String emailContacto, String telefono,
                             Integer rubroId, Integer ciudadId, Integer tamanoEmpresaId, String descripcionEmpresa, String sitioWeb, Instant updatedAt, String nombre, String area) {}
    public record NuevoUsuario(String email, String password, String rol, boolean emailVerificado, PerfilFila perfil) {}
    /** Campos que se cambian; los null no se tocan. */
    public record CambiosUsuario(Boolean activo, Boolean emailVerificado, String password) {}
    public record Foto(String foto) {}
    public record CatalogoFila(Integer id, String nombre) {}
    public record CiudadFila(Integer id, String nombre, Integer regionId) {}

    private final UsuarioRepo usuarios; private final RolRepo roles; private final LicitadorRepo licitadores; private final PymeRepo pymes; private final AdministradorRepo admins;
    private final RubroRepo rubros; private final RegionRepo regiones; private final CiudadRepo ciudades; private final TamanoRepo tamanos;

    public UsuariosBdController(UsuarioRepo usuarios, RolRepo roles, LicitadorRepo licitadores, PymeRepo pymes, AdministradorRepo admins,
                                RubroRepo rubros, RegionRepo regiones, CiudadRepo ciudades, TamanoRepo tamanos) {
        this.usuarios = usuarios; this.roles = roles; this.licitadores = licitadores; this.pymes = pymes; this.admins = admins;
        this.rubros = rubros; this.regiones = regiones; this.ciudades = ciudades; this.tamanos = tamanos;
    }

    // ---------- mapeo ----------
    private static UsuarioFila fila(Usuario u) { return new UsuarioFila(u.getId(), u.getEmail(), u.getPassword(), u.getRolNombre(), u.isActivo(), u.isEmailVerificado(), u.getCreatedAt(), u.getFoto()); }
    private static PerfilFila fila(PerfilBase p, String tipo) {
        return new PerfilFila(p.getUsuarioId(), tipo, p.getRazonSocial(), p.getRut(), p.getRutPersona(), p.getNombreContacto(), p.getEmailContacto(), p.getTelefono(),
                p.getRubroId(), p.getCiudadId(), p.getTamanoEmpresaId(), p.getDescripcionEmpresa(), p.getSitioWeb(), p.getUpdatedAt(), null, null);
    }
    private static PerfilFila fila(Administrador a) { return new PerfilFila(a.getUsuarioId(), "ADMIN", null, null, null, null, null, null, null, null, null, null, null, null, a.getNombre(), a.getArea()); }

    private Usuario usuario(long id) { return usuarios.findById(id).orElseThrow(() -> ApiException.noEncontrado("Usuario no encontrado")); }
    private Optional<PerfilBase> empresa(Usuario u) {
        return switch (u.getRolNombre()) {
            case "LICITADOR" -> licitadores.findByUsuarioId(u.getId()).map(x -> (PerfilBase) x);
            case "PYME" -> pymes.findByUsuarioId(u.getId()).map(x -> (PerfilBase) x);
            default -> Optional.empty();
        };
    }

    // ---------- usuario ----------
    @GetMapping("/usuarios") public List<UsuarioFila> todos() { return usuarios.findAll().stream().map(UsuariosBdController::fila).toList(); }
    @GetMapping("/usuarios/{id}") public UsuarioFila obtener(@PathVariable long id) { return fila(usuario(id)); }

    @GetMapping("/usuarios/por-email")
    public UsuarioFila porEmail(@RequestParam String email) { return usuarios.findByEmailIgnoreCase(email.trim()).map(UsuariosBdController::fila).orElseThrow(() -> ApiException.noEncontrado("Usuario no encontrado")); }

    @GetMapping("/usuarios/existe") public Map<String, Boolean> existeEmail(@RequestParam String email) { return Map.of("existe", usuarios.existsByEmailIgnoreCase(email.trim())); }

    /**
     * Flujo POST del ER: una transacción con INSERT en usuario y luego en licitador o pyme.
     * Si falla cualquier INSERT se hace rollback completo (el RUT y el correo son únicos: 409).
     */
    @PostMapping("/usuarios") @ResponseStatus(HttpStatus.CREATED) @Transactional
    public UsuarioFila crear(@RequestBody NuevoUsuario d) {
        if (usuarios.existsByEmailIgnoreCase(d.email())) throw ApiException.conflicto("Ya existe una cuenta con ese correo");
        Usuario u = new Usuario();
        u.setEmail(d.email()); u.setPassword(d.password()); u.setEmailVerificado(d.emailVerificado());
        u.setRol(roles.findByNombre(d.rol()).orElseThrow(() -> ApiException.invalido("Rol inexistente")));
        u = usuarios.save(u);
        PerfilFila f = d.perfil();
        boolean pyme = "PYME".equals(d.rol());
        PerfilBase p = pyme ? new Pyme() : new Licitador();
        p.setUsuarioId(u.getId()); p.setRazonSocial(f.razonSocial()); p.setRut(f.rut()); p.setRutPersona(f.rutPersona());
        p.setNombreContacto(f.nombreContacto()); p.setEmailContacto(f.emailContacto()); p.setTelefono(f.telefono());
        p.setRubroId(f.rubroId()); p.setCiudadId(f.ciudadId()); p.setDescripcionEmpresa(f.descripcionEmpresa()); p.setSitioWeb(f.sitioWeb());
        if (pyme) { ((Pyme) p).setTamanoEmpresaId(f.tamanoEmpresaId()); pymes.save((Pyme) p); } else licitadores.save((Licitador) p);
        return fila(u);
    }

    @PatchMapping("/usuarios/{id}") @Transactional
    public UsuarioFila cambiar(@PathVariable long id, @RequestBody CambiosUsuario c) {
        Usuario u = usuario(id);
        if (c.activo() != null) u.setActivo(c.activo());
        if (c.emailVerificado() != null) u.setEmailVerificado(c.emailVerificado());
        if (c.password() != null) u.setPassword(c.password());
        return fila(u);
    }

    /** Foto de perfil (data URL); null la quita. */
    @PutMapping("/usuarios/{id}/foto") @Transactional
    public UsuarioFila foto(@PathVariable long id, @RequestBody Foto f) { Usuario u = usuario(id); u.setFoto(f.foto()); return fila(u); }

    @DeleteMapping("/usuarios/{id}") @ResponseStatus(HttpStatus.NO_CONTENT) @Transactional
    public void eliminar(@PathVariable long id) {
        Usuario u = usuario(id);
        licitadores.deleteByUsuarioId(id); pymes.deleteByUsuarioId(id); admins.deleteByUsuarioId(id); usuarios.delete(u);
    }

    // ---------- perfil (licitador / pyme / administrador) ----------
    @GetMapping("/perfiles/{usuarioId}")
    public PerfilFila perfil(@PathVariable long usuarioId) {
        Usuario u = usuario(usuarioId);
        if ("ADMIN".equals(u.getRolNombre())) return admins.findByUsuarioId(usuarioId).map(UsuariosBdController::fila).orElseThrow(() -> ApiException.noEncontrado("Perfil no encontrado"));
        return empresa(u).map(p -> fila(p, u.getRolNombre())).orElseThrow(() -> ApiException.noEncontrado("Perfil no encontrado"));
    }

    @GetMapping("/perfiles")
    public List<PerfilFila> perfiles() {
        List<PerfilFila> out = new ArrayList<>();
        licitadores.findAll().forEach(p -> out.add(fila(p, "LICITADOR")));
        pymes.findAll().forEach(p -> out.add(fila(p, "PYME")));
        admins.findAll().forEach(a -> out.add(fila(a)));
        return out;
    }

    /** Ids de las Pymes de ese rubro con cuenta activa y correo verificado (para avisarles de licitaciones nuevas de su rubro). */
    @GetMapping("/pymes/por-rubro/{rubroId}")
    public List<Long> pymesPorRubro(@PathVariable int rubroId) {
        List<Long> ids = pymes.findByRubroId(rubroId).stream().map(Pyme::getUsuarioId).toList();
        return usuarios.findAllById(ids).stream().filter(u -> u.isActivo() && u.isEmailVerificado()).map(Usuario::getId).sorted().toList();
    }

    /** ¿Ya hay un licitador o pyme con ese RUT de empresa (rut) o de persona de contacto (rutPersona)? */
    @GetMapping("/perfiles/existe")
    public Map<String, Boolean> existe(@RequestParam(required = false) String rut, @RequestParam(required = false) String rutPersona) {
        boolean e = rut != null ? licitadores.existsByRut(rut) || pymes.existsByRut(rut) : rutPersona != null && (licitadores.existsByRutPersona(rutPersona) || pymes.existsByRutPersona(rutPersona));
        return Map.of("existe", e);
    }

    /** Actualiza los campos editables que vengan (no null). El correo de acceso y los RUT no se editan (ER). */
    @PutMapping("/perfiles/{usuarioId}") @Transactional
    public PerfilFila actualizar(@PathVariable long usuarioId, @RequestBody PerfilFila d) {
        Usuario u = usuario(usuarioId);
        PerfilBase p = empresa(u).orElseThrow(() -> ApiException.noEncontrado("Perfil no encontrado"));
        if (d.razonSocial() != null) p.setRazonSocial(d.razonSocial());
        if (d.nombreContacto() != null) p.setNombreContacto(d.nombreContacto());
        if (d.emailContacto() != null) p.setEmailContacto(d.emailContacto());
        if (d.telefono() != null) p.setTelefono(d.telefono());
        if (d.rubroId() != null) p.setRubroId(d.rubroId());
        if (d.ciudadId() != null) p.setCiudadId(d.ciudadId());
        if (d.tamanoEmpresaId() != null && p instanceof Pyme py) py.setTamanoEmpresaId(d.tamanoEmpresaId());
        if (d.sitioWeb() != null) p.setSitioWeb(d.sitioWeb());
        if (d.descripcionEmpresa() != null) p.setDescripcionEmpresa(d.descripcionEmpresa());
        p.setUpdatedAt(Instant.now());
        return fila(p, u.getRolNombre());
    }

    // ---------- catálogos ----------
    @GetMapping("/catalogos/rubros") public List<CatalogoFila> rubros() { return rubros.findAllByOrderByNombre().stream().map(c -> new CatalogoFila(c.getId(), c.getNombre())).toList(); }
    @GetMapping("/catalogos/regiones") public List<CatalogoFila> regiones() { return regiones.findAllByOrderByNombre().stream().map(c -> new CatalogoFila(c.getId(), c.getNombre())).toList(); }
    @GetMapping("/catalogos/tamanos") public List<CatalogoFila> tamanos() { return tamanos.findAllByOrderByIdAsc().stream().map(c -> new CatalogoFila(c.getId(), c.getNombre())).toList(); }
    @GetMapping("/catalogos/ciudades")
    public List<CiudadFila> ciudades(@RequestParam(required = false) Integer regionId) {
        List<Ciudad> l = regionId == null ? ciudades.findAllByOrderByNombre() : ciudades.findByRegionIdOrderByNombre(regionId);
        return l.stream().map(c -> new CiudadFila(c.getId(), c.getNombre(), c.getRegionId())).toList();
    }
}
