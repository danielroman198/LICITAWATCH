package cl.licitawatch.notificaciones.bff;

import cl.licitawatch.common.Auth;
import cl.licitawatch.common.InternalClient;
import com.fasterxml.jackson.databind.JsonNode;
import jakarta.servlet.http.HttpServletRequest;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

/** BFF de Notificaciones: valida la sesión y delega en la capa BS. */
@RestController
public class NotificacionController {
    private final InternalClient bs; private final String urlBs;
    public NotificacionController(InternalClient bs, @Value("${lw.urls.bs}") String urlBs) { this.bs = bs; this.urlBs = urlBs; }

    @GetMapping("/api/notificaciones") public JsonNode mias(HttpServletRequest r) { Auth.sesion(r); return bs.get(urlBs + "/bs/notificaciones", JsonNode.class); }

    /** "Leída" vive en el navegador (el ER no la guarda): solo confirma la sesión. */
    @PostMapping("/api/notificaciones/leidas") public ResponseEntity<Void> leidas(HttpServletRequest r) { Auth.sesion(r); return ResponseEntity.noContent().build(); }
}
