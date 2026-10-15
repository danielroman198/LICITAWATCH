package cl.licitawatch.usuarios.bff;

import cl.licitawatch.common.Auth;
import cl.licitawatch.usuarios.bff.Dto.*;
import cl.licitawatch.usuarios.bs.AuthService;
import cl.licitawatch.usuarios.bs.RegistroService;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

@RestController
public class AuthController {
    private final AuthService auth; private final RegistroService registro;
    public AuthController(AuthService auth, RegistroService registro) { this.auth = auth; this.registro = registro; }

    @PostMapping("/api/auth/login") public SesionDto login(@Valid @RequestBody Login b) { return auth.login(b.email(), b.password()); }

    @GetMapping("/api/auth/me")
    public SesionDto me(HttpServletRequest r) { return auth.me(Auth.sesion(r).usuarioId(), r.getHeader("Authorization").substring(7)); }

    @PostMapping("/api/auth/recuperar")
    public Map<String, String> recuperar(@Valid @RequestBody Recuperar b) { auth.solicitarRecuperacion(b.email()); return Map.of("mensaje", "Si el correo existe, enviamos un enlace de recuperación"); }

    @PostMapping("/api/auth/restablecer")
    public Map<String, String> restablecer(@Valid @RequestBody Restablecer b) { auth.restablecer(b.token(), b.password()); return Map.of("mensaje", "Contraseña actualizada"); }

    @PostMapping("/api/usuarios/registro/licitador")
    public ResponseEntity<SesionDto> regLicitador(@Valid @RequestBody Registro b) { return ResponseEntity.status(HttpStatus.CREATED).body(registro.registrar("LICITADOR", b)); }

    @PostMapping("/api/usuarios/registro/pyme")
    public ResponseEntity<SesionDto> regPyme(@Valid @RequestBody Registro b) { return ResponseEntity.status(HttpStatus.CREATED).body(registro.registrar("PYME", b)); }

    @GetMapping("/api/usuarios/disponibilidad/email") public Disponible email(@RequestParam String valor) { return new Disponible(registro.emailDisponible(valor)); }
    @GetMapping("/api/usuarios/disponibilidad/rut") public Disponible rut(@RequestParam String valor) { return new Disponible(registro.rutDisponible(valor)); }
    @GetMapping("/api/usuarios/disponibilidad/rut-persona") public Disponible rutPersona(@RequestParam String valor) { return new Disponible(registro.rutPersonaDisponible(valor)); }

    @PutMapping("/api/usuarios/perfil")
    public PerfilDto perfil(HttpServletRequest r, @RequestBody PerfilEdicion b) { return registro.actualizarPerfil(Auth.sesion(r).usuarioId(), b); }
}
