package cl.licitawatch.notificaciones.bs;

import cl.licitawatch.common.Auth;
import jakarta.servlet.http.HttpServletRequest;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

/** Capa BS de Notificaciones. /bs/** lo llama el BFF (con la sesión en cabeceras); /internal/** lo llaman las capas BS de otros dominios. */
@RestController
public class NotificacionBsController {
    public record Nueva(long usuarioId, String tipo, String titulo, String detalle, boolean enviarCorreo) {}
    private final NotificacionService svc;
    public NotificacionBsController(NotificacionService svc) { this.svc = svc; }

    @GetMapping("/bs/notificaciones") public List<NotificacionService.NotificacionDto> mias(HttpServletRequest r) { return svc.de(Auth.sesion(r).usuarioId()); }

    @PostMapping("/internal/notificaciones")
    public ResponseEntity<Void> crear(@RequestBody Nueva n) { svc.crear(n.usuarioId(), n.tipo(), n.titulo(), n.detalle(), n.enviarCorreo()); return ResponseEntity.accepted().build(); }
}
