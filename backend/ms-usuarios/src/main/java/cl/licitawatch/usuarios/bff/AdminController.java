package cl.licitawatch.usuarios.bff;

import cl.licitawatch.common.Auth;
import cl.licitawatch.usuarios.bff.Dto.*;
import cl.licitawatch.usuarios.bs.AdminService;
import jakarta.servlet.http.HttpServletRequest;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/admin")
public class AdminController {
    private final AdminService admin;
    public AdminController(AdminService admin) { this.admin = admin; }

    @GetMapping("/estadisticas") public Map<String, Object> estadisticas(HttpServletRequest r) { Auth.exigir(r, "ADMIN"); return admin.estadisticas(); }

    @GetMapping("/usuarios")
    public List<UsuarioAdmin> usuarios(HttpServletRequest r, @RequestParam(required = false) String q, @RequestParam(required = false) String rol, @RequestParam(required = false) String estado) {
        Auth.exigir(r, "ADMIN"); return admin.listar(q, rol, estado);
    }

    @PatchMapping("/usuarios/{id}/estado")
    public ResponseEntity<Void> estado(HttpServletRequest r, @PathVariable long id, @RequestBody Estado b) { Auth.exigir(r, "ADMIN"); admin.cambiarEstado(id, b.activo()); return ResponseEntity.noContent().build(); }

    @DeleteMapping("/usuarios/{id}")
    public ResponseEntity<Void> eliminar(HttpServletRequest r, @PathVariable long id) { Auth.exigir(r, "ADMIN"); admin.eliminar(id); return ResponseEntity.noContent().build(); }
}
