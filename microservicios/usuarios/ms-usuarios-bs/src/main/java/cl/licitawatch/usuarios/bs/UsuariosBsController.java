package cl.licitawatch.usuarios.bs;

import cl.licitawatch.common.ApiException;
import cl.licitawatch.common.Auth;
import cl.licitawatch.usuarios.ambassador.SiiAmbassador;
import cl.licitawatch.usuarios.ambassador.SiiAmbassador.ConsultaSii;
import cl.licitawatch.usuarios.bs.Dto.*;
import jakarta.servlet.http.HttpServletRequest;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

/** Capa BS de Usuarios: la llama el BFF (con la sesión en cabeceras cuando hay usuario conectado). */
@RestController
@RequestMapping("/bs")
public class UsuariosBsController {
    private final AuthService auth; private final RegistroService registro; private final AdminService admin; private final UsuariosBd bd; private final SiiAmbassador sii;
    public UsuariosBsController(AuthService auth, RegistroService registro, AdminService admin, UsuariosBd bd, SiiAmbassador sii) {
        this.auth = auth; this.registro = registro; this.admin = admin; this.bd = bd; this.sii = sii;
    }

    // ---------- autenticación ----------
    @PostMapping("/auth/login") public SesionDto login(@RequestBody Login b) { return auth.login(b.email(), b.password()); }
    @GetMapping("/auth/me") public SesionDto me(HttpServletRequest r) { return auth.me(Auth.sesion(r).usuarioId()); }
    @PostMapping("/auth/recuperar") public void recuperar(@RequestBody Recuperar b) { auth.solicitarRecuperacion(b.email()); }
    @PostMapping("/auth/restablecer") public void restablecer(@RequestBody Restablecer b) { auth.restablecer(b.token(), b.password()); }
    @PostMapping("/auth/verificar") public void verificar(@RequestBody Verificar b) { auth.verificar(b.token()); }
    @PostMapping("/auth/reenviar-verificacion") public void reenviar(@RequestBody Recuperar b) { auth.reenviarVerificacion(b.email()); }

    // ---------- registro y perfil ----------
    @PostMapping("/usuarios/registro/{rol}") @ResponseStatus(HttpStatus.CREATED)
    public RegistroOk registrar(@PathVariable String rol, @RequestBody Registro b) {
        if (!"LICITADOR".equals(rol) && !"PYME".equals(rol)) throw ApiException.invalido("Rol inexistente");
        return registro.registrar(rol, b);
    }
    @GetMapping("/usuarios/disponibilidad/email") public Disponible email(@RequestParam String valor) { return new Disponible(registro.emailDisponible(valor)); }
    @GetMapping("/usuarios/disponibilidad/rut") public Disponible rut(@RequestParam String valor) { return new Disponible(registro.rutDisponible(valor)); }
    @GetMapping("/usuarios/disponibilidad/rut-persona") public Disponible rutPersona(@RequestParam String valor) { return new Disponible(registro.rutPersonaDisponible(valor)); }

    @PutMapping("/usuarios/foto") public UsuarioDto foto(HttpServletRequest r, @RequestBody Foto b) { return auth.actualizarFoto(Auth.sesion(r).usuarioId(), b.foto()); }
    @DeleteMapping("/usuarios/foto") public UsuarioDto quitarFoto(HttpServletRequest r) { return auth.actualizarFoto(Auth.sesion(r).usuarioId(), null); }
    @PutMapping("/usuarios/perfil") public PerfilDto perfil(HttpServletRequest r, @RequestBody PerfilEdicion b) { return registro.actualizarPerfil(Auth.sesion(r).usuarioId(), b); }

    // ---------- SII (Ambassador) y catálogos ----------
    @GetMapping("/sii/{rut}")
    public ConsultaSii consultar(@PathVariable String rut) {
        String r = Rut.limpiar(rut);
        if (bd.rutExiste(r)) throw ApiException.conflicto("Este RUT de empresa ya está registrado en LicitaWatch");
        return sii.consultar(r);
    }
    @GetMapping("/catalogos/rubros") public List<UsuariosBd.CatalogoFila> rubros() { return bd.rubros(); }
    @GetMapping("/catalogos/regiones") public List<UsuariosBd.CatalogoFila> regiones() { return bd.regiones(); }
    @GetMapping("/catalogos/tamanos") public List<UsuariosBd.CatalogoFila> tamanos() { return bd.tamanos(); }
    @GetMapping("/catalogos/ciudades") public List<UsuariosBd.CiudadFila> ciudades(@RequestParam(required = false) Integer regionId) { return bd.ciudades(regionId); }

    // ---------- administración ----------
    @GetMapping("/admin/estadisticas") public Map<String, Object> estadisticas() { return admin.estadisticas(); }
    @GetMapping("/admin/usuarios")
    public List<UsuarioAdmin> usuarios(@RequestParam(required = false) String q, @RequestParam(required = false) String rol, @RequestParam(required = false) String estado) { return admin.listar(q, rol, estado); }
    @PatchMapping("/admin/usuarios/{id}/estado") @ResponseStatus(HttpStatus.NO_CONTENT)
    public void estado(@PathVariable long id, @RequestBody Estado b) { admin.cambiarEstado(id, b.activo()); }
    @DeleteMapping("/admin/usuarios/{id}") @ResponseStatus(HttpStatus.NO_CONTENT)
    public void eliminar(@PathVariable long id) { admin.eliminar(id); }
}
