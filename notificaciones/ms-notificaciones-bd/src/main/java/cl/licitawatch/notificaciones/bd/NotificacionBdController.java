package cl.licitawatch.notificaciones.bd;

import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.*;

import java.time.Instant;
import java.util.List;
import java.util.Map;

/** Capa BD de Notificaciones: acceso a las tablas notificacion y tipo_notificacion. Solo la llama la capa BS (X-Internal-Key). */
@RestController
@RequestMapping("/bd/notificaciones")
public class NotificacionBdController {
    public record NuevaFila(long usuarioId, String tipo) {}
    public record Fila(Long id, Long usuarioId, String tipo, String canal, Instant createdAt) {}

    private final NotificacionRepo repo; private final TipoRepo tipos;
    public NotificacionBdController(NotificacionRepo repo, TipoRepo tipos) { this.repo = repo; this.tipos = tipos; }

    private static Fila fila(Notificacion n) { return new Fila(n.getId(), n.getUsuarioId(), n.getTipo().getNombre(), n.getCanal(), n.getCreatedAt()); }

    /** Inserta una fila si el tipo existe en el catálogo; si no (p. ej. "CORREO"), no guarda nada. */
    @PostMapping @Transactional
    public Map<String, Boolean> crear(@RequestBody NuevaFila d) {
        return Map.of("guardada", tipos.findByNombre(d.tipo()).map(t -> {
            Notificacion n = new Notificacion(); n.setUsuarioId(d.usuarioId()); n.setTipo(t); repo.save(n); return true;
        }).orElse(false));
    }

    /** Las 50 más recientes del usuario. */
    @GetMapping
    public List<Fila> deUsuario(@RequestParam long usuarioId) { return repo.findTop50ByUsuarioIdOrderByIdDesc(usuarioId).stream().map(NotificacionBdController::fila).toList(); }
}
