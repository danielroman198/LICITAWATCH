package cl.licitawatch.usuarios.bff;

import cl.licitawatch.common.Auth;
import cl.licitawatch.common.InternalClient;
import cl.licitawatch.usuarios.bff.Dto.*;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.node.ObjectNode;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.validation.Valid;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpMethod;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

import static cl.licitawatch.common.InternalClient.q;

/** BFF de autenticación, registro y perfil: valida el formato de los datos y la sesión, y delega en la capa BS. */
@RestController
public class AuthController {
    private final InternalClient bs; private final String urlBs;
    public AuthController(InternalClient bs, @Value("${lw.urls.bs}") String urlBs) { this.bs = bs; this.urlBs = urlBs; }

    private JsonNode get(String ruta) { return bs.get(urlBs + ruta, JsonNode.class); }
    private JsonNode post(String ruta, Object body) { return bs.post(urlBs + ruta, body, JsonNode.class); }

    @PostMapping("/api/auth/login") public JsonNode login(@Valid @RequestBody Login b) { return post("/bs/auth/login", b); }

    /** La capa BS arma la sesión; el token es el mismo que trajo la petición. */
    @GetMapping("/api/auth/me")
    public JsonNode me(HttpServletRequest r) {
        Auth.sesion(r);
        JsonNode s = get("/bs/auth/me");
        ((ObjectNode) s).put("token", r.getHeader("Authorization").substring(7));
        return s;
    }

    @PostMapping("/api/auth/recuperar")
    public Map<String, String> recuperar(@Valid @RequestBody Recuperar b) { post("/bs/auth/recuperar", b); return Map.of("mensaje", "Si el correo existe, enviamos un enlace de recuperación"); }

    @PostMapping("/api/auth/restablecer")
    public Map<String, String> restablecer(@Valid @RequestBody Restablecer b) { post("/bs/auth/restablecer", b); return Map.of("mensaje", "Contraseña actualizada"); }

    @PostMapping("/api/auth/verificar")
    public Map<String, String> verificar(@Valid @RequestBody Verificar b) { post("/bs/auth/verificar", b); return Map.of("mensaje", "Cuenta verificada"); }

    @PostMapping("/api/auth/reenviar-verificacion")
    public Map<String, String> reenviar(@Valid @RequestBody Recuperar b) { post("/bs/auth/reenviar-verificacion", b); return Map.of("mensaje", "Si la cuenta está pendiente de verificación, enviamos un nuevo enlace"); }

    @PostMapping("/api/usuarios/registro/licitador")
    public ResponseEntity<JsonNode> regLicitador(@Valid @RequestBody Registro b) { return ResponseEntity.status(HttpStatus.CREATED).body(post("/bs/usuarios/registro/LICITADOR", b)); }

    @PostMapping("/api/usuarios/registro/pyme")
    public ResponseEntity<JsonNode> regPyme(@Valid @RequestBody Registro b) { return ResponseEntity.status(HttpStatus.CREATED).body(post("/bs/usuarios/registro/PYME", b)); }

    @GetMapping("/api/usuarios/disponibilidad/email") public JsonNode email(@RequestParam String valor) { return get("/bs/usuarios/disponibilidad/email?valor=" + q(valor)); }
    @GetMapping("/api/usuarios/disponibilidad/rut") public JsonNode rut(@RequestParam String valor) { return get("/bs/usuarios/disponibilidad/rut?valor=" + q(valor)); }
    @GetMapping("/api/usuarios/disponibilidad/rut-persona") public JsonNode rutPersona(@RequestParam String valor) { return get("/bs/usuarios/disponibilidad/rut-persona?valor=" + q(valor)); }

    @PutMapping("/api/usuarios/foto") public JsonNode foto(HttpServletRequest r, @Valid @RequestBody Foto b) { Auth.sesion(r); return bs.put(urlBs + "/bs/usuarios/foto", b, JsonNode.class); }
    @DeleteMapping("/api/usuarios/foto") public JsonNode quitarFoto(HttpServletRequest r) { Auth.sesion(r); return bs.reenviar(HttpMethod.DELETE, urlBs + "/bs/usuarios/foto", null); }

    @PutMapping("/api/usuarios/perfil")
    public JsonNode perfil(HttpServletRequest r, @RequestBody PerfilEdicion b) { Auth.sesion(r); return bs.put(urlBs + "/bs/usuarios/perfil", b, JsonNode.class); }
}
