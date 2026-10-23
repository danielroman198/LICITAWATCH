package cl.licitawatch.usuarios.bs;

import cl.licitawatch.usuarios.bs.UsuariosBd.PerfilFila;
import cl.licitawatch.usuarios.bs.UsuariosBd.UsuarioFila;
import org.springframework.web.bind.annotation.*;

import java.util.HashMap;
import java.util.Map;

/** Endpoints de servicio a servicio (cabecera X-Internal-Key): los usan las capas BS de los demás dominios. */
@RestController
@RequestMapping("/internal/usuarios")
public class InternalController {
    private final UsuariosBd bd;
    public InternalController(UsuariosBd bd) { this.bd = bd; }

    @GetMapping("/{id}/resumen")
    public Map<String, Object> resumen(@PathVariable long id) {
        UsuarioFila u = bd.usuario(id);
        PerfilFila perfil = bd.perfil(id).orElse(null);
        PerfilFila p = perfil != null && perfil.esEmpresa() ? perfil : null;
        Map<String, Object> m = new HashMap<>();
        m.put("id", id); m.put("email", u.email()); m.put("rol", u.rol()); m.put("activo", u.activo());
        m.put("nombre", perfil != null ? perfil.nombreVisible() : u.email()); m.put("rubroId", p != null ? p.rubroId() : null);
        m.put("tamanoEmpresaId", p != null ? p.tamanoEmpresaId() : null); m.put("ciudadId", p != null ? p.ciudadId() : null); m.put("emailContacto", p != null ? p.emailContacto() : u.email());
        m.put("rut", p != null ? Rut.formatear(p.rut()) : null); m.put("nombreContacto", p != null ? p.nombreContacto() : null);   // p. ej. para el chat
        return m;
    }
}
