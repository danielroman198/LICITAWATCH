package cl.licitawatch.usuarios.bff;

import cl.licitawatch.common.Auth;
import cl.licitawatch.common.InternalClient;
import cl.licitawatch.usuarios.bff.Dto.Estado;
import com.fasterxml.jackson.databind.JsonNode;
import jakarta.servlet.http.HttpServletRequest;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpMethod;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.util.UriComponentsBuilder;

import java.util.Optional;

/** BFF de administración: solo rol ADMIN; delega en la capa BS. */
@RestController
@RequestMapping("/api/admin")
public class AdminController {
    private final InternalClient bs; private final String urlBs;
    public AdminController(InternalClient bs, @Value("${lw.urls.bs}") String urlBs) { this.bs = bs; this.urlBs = urlBs; }

    @GetMapping("/estadisticas") public JsonNode estadisticas(HttpServletRequest r) { Auth.exigir(r, "ADMIN"); return bs.get(urlBs + "/bs/admin/estadisticas", JsonNode.class); }

    @GetMapping("/usuarios")
    public JsonNode usuarios(HttpServletRequest r, @RequestParam(required = false) String q, @RequestParam(required = false) String rol, @RequestParam(required = false) String estado) {
        Auth.exigir(r, "ADMIN");
        String url = UriComponentsBuilder.fromHttpUrl(urlBs + "/bs/admin/usuarios").queryParamIfPresent("q", Optional.ofNullable(q))
                .queryParamIfPresent("rol", Optional.ofNullable(rol)).queryParamIfPresent("estado", Optional.ofNullable(estado)).encode().toUriString();
        return bs.get(url, JsonNode.class);
    }

    @PatchMapping("/usuarios/{id}/estado")
    public ResponseEntity<Void> estado(HttpServletRequest r, @PathVariable long id, @RequestBody Estado b) {
        Auth.exigir(r, "ADMIN"); bs.reenviar(HttpMethod.PATCH, urlBs + "/bs/admin/usuarios/" + id + "/estado", b); return ResponseEntity.noContent().build();
    }

    @DeleteMapping("/usuarios/{id}")
    public ResponseEntity<Void> eliminar(HttpServletRequest r, @PathVariable long id) { Auth.exigir(r, "ADMIN"); bs.delete(urlBs + "/bs/admin/usuarios/" + id); return ResponseEntity.noContent().build(); }
}
