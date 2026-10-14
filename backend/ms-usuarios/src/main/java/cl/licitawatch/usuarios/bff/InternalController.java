package cl.licitawatch.usuarios.bff;

import cl.licitawatch.common.ApiException;
import cl.licitawatch.usuarios.bd.*;
import cl.licitawatch.usuarios.bd.Repos.UsuarioRepo;
import cl.licitawatch.usuarios.bs.PerfilService;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

/** Endpoints de servicio a servicio (cabecera X-Internal-Key). */
@RestController
@RequestMapping("/internal/usuarios")
public class InternalController {
    private final UsuarioRepo usuarios; private final PerfilService perfiles;
    public InternalController(UsuarioRepo usuarios, PerfilService perfiles) { this.usuarios = usuarios; this.perfiles = perfiles; }

    @GetMapping("/{id}/resumen")
    public Map<String, Object> resumen(@PathVariable long id) {
        Usuario u = usuarios.findById(id).orElseThrow(() -> ApiException.noEncontrado("Usuario no encontrado"));
        PerfilBase p = perfiles.empresa(u).orElse(null);
        Map<String, Object> m = new java.util.HashMap<>();
        m.put("id", id); m.put("email", u.getEmail()); m.put("rol", u.getRolNombre()); m.put("activo", u.isActivo());
        m.put("nombre", perfiles.nombre(u)); m.put("rubroId", p != null ? p.getRubroId() : null);
        m.put("tamanoEmpresaId", p != null ? p.getTamanoEmpresaId() : null); m.put("ciudadId", p != null ? p.getCiudadId() : null); m.put("emailContacto", p != null ? p.getEmailContacto() : u.getEmail());
        return m;
    }
}
