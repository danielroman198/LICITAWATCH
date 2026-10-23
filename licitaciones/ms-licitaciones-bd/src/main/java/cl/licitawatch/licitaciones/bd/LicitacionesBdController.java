package cl.licitawatch.licitaciones.bd;

import cl.licitawatch.common.ApiException;
import cl.licitawatch.licitaciones.bd.Catalogos.*;
import cl.licitawatch.licitaciones.bd.Repos.*;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.HttpStatus;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.*;

import java.math.BigDecimal;
import java.time.Instant;
import java.time.LocalDate;
import java.util.*;

/** Capa BD de Licitaciones: licitacion, postulacion y sus catálogos. Solo la llama la capa BS (X-Internal-Key). */
@RestController
@RequestMapping("/bd")
public class LicitacionesBdController {
    /** Fila de licitacion con el nombre de sus catálogos, más el n.º de postulaciones y la Pyme con la postulación aprobada (si hay). */
    public record LicFila(Long id, Long licitadorId, String titulo, String descripcion, Integer rubroId, Integer regionId, Long presupuestoMin, Long presupuestoMax,
                          Integer maxPostulantes, String imagenUrl, String archivoUrl, String archivoNombre, String tipoArchivo, LocalDate fechaCierre, String estado,
                          Instant createdAt, long postulantes, Long pymeAdjudicadaId) {}
    public record PostFila(Long id, Long licitacionId, Long pymeId, String mensaje, LocalDate fechaPostulacion, String estado, Instant updatedAt) {}
    public record NuevaLic(Long licitadorId, String titulo, String descripcion, Integer rubroId, Integer regionId, Long presupuestoMin, Long presupuestoMax,
                           Integer maxPostulantes, String imagenUrl, String archivoNombre, String tipoArchivo, LocalDate fechaCierre) {}
    public record NuevaPost(Long licitacionId, Long pymeId, String mensaje) {}
    public record Estado(String estado) {}

    private final LicitacionRepo lics; private final PostulacionRepo posts; private final EstadoLicitacionRepo estadosLic; private final EstadoPostulacionRepo estadosPost; private final TipoArchivoRepo tipos;

    public LicitacionesBdController(LicitacionRepo lics, PostulacionRepo posts, EstadoLicitacionRepo estadosLic, EstadoPostulacionRepo estadosPost, TipoArchivoRepo tipos) {
        this.lics = lics; this.posts = posts; this.estadosLic = estadosLic; this.estadosPost = estadosPost; this.tipos = tipos;
    }

    private LicFila fila(Licitacion l) {
        Long adjudicada = null;
        if ("Adjudicada".equals(l.getEstado().getNombre()))
            adjudicada = posts.findByLicitacionId(l.getId()).stream().filter(p -> "Aprobada".equals(p.getEstado().getNombre())).map(Postulacion::getPymeId).findFirst().orElse(null);
        return new LicFila(l.getId(), l.getLicitadorId(), l.getTitulo(), l.getDescripcion(), l.getRubroId(), l.getRegionId(), aLong(l.getPresupuestoMin()), aLong(l.getPresupuestoMax()),
                l.getMaxPostulantes(), l.getImagenUrl(), l.getArchivoUrl(), l.getArchivoNombre(), l.getTipoArchivo() == null ? null : l.getTipoArchivo().getNombre(), l.getFechaCierre(),
                l.getEstado().getNombre(), l.getCreatedAt(), posts.countByLicitacionId(l.getId()), adjudicada);
    }
    private static PostFila fila(Postulacion p) { return new PostFila(p.getId(), p.getLicitacionId(), p.getPymeId(), p.getMensaje(), p.getFechaPostulacion(), p.getEstado().getNombre(), p.getUpdatedAt()); }
    private List<LicFila> filas(Collection<Licitacion> ls) { return ls.stream().map(this::fila).toList(); }
    private static Long aLong(BigDecimal b) { return b == null ? null : b.longValue(); }
    private static BigDecimal aDec(Long l) { return l == null ? null : BigDecimal.valueOf(l); }

    private Licitacion lic(long id) { return lics.findById(id).orElseThrow(() -> ApiException.noEncontrado("Licitación no encontrada")); }
    private Postulacion post(long id) { return posts.findById(id).orElseThrow(() -> ApiException.noEncontrado("Postulación no encontrada")); }
    private EstadoLicitacion el(String n) { return estadosLic.findByNombre(n).orElseThrow(() -> ApiException.invalido("Estado de licitación inexistente: " + n)); }
    private EstadoPostulacion ep(String n) { return estadosPost.findByNombre(n).orElseThrow(() -> ApiException.invalido("Estado de postulación inexistente: " + n)); }

    // ---------- licitacion ----------
    /** Todas (más reciente primero), o filtradas por licitadorId o por ids. */
    @GetMapping("/licitaciones")
    public List<LicFila> licitaciones(@RequestParam(required = false) Long licitadorId, @RequestParam(required = false) List<Long> ids) {
        if (ids != null) return filas(lics.findAllById(ids));
        return filas(licitadorId != null ? lics.findByLicitadorIdOrderByCreatedAtDesc(licitadorId) : lics.findAllByOrderByCreatedAtDesc());
    }

    @GetMapping("/licitaciones/buscar")
    public List<LicFila> buscar(@RequestParam(defaultValue = "") String q, @RequestParam(required = false) Integer rubroId, @RequestParam(required = false) Integer regionId,
                                @RequestParam(required = false) Long presupuestoMax) {
        return filas(lics.buscar(q.trim(), rubroId, regionId, aDec(presupuestoMax)));
    }

    @GetMapping("/licitaciones/{id}") public LicFila obtener(@PathVariable long id) { return fila(lic(id)); }

    /** Nueva licitación en estado 'Abierta'. El ER guarda un documento complementario opcional (archivo_url / archivo_nombre / tipo_archivo_id). */
    @PostMapping("/licitaciones") @Transactional
    public LicFila crear(@RequestBody NuevaLic d) {
        Licitacion l = new Licitacion();
        l.setLicitadorId(d.licitadorId()); l.setTitulo(d.titulo()); l.setDescripcion(d.descripcion()); l.setRubroId(d.rubroId()); l.setRegionId(d.regionId());
        l.setPresupuestoMin(aDec(d.presupuestoMin())); l.setPresupuestoMax(aDec(d.presupuestoMax())); l.setMaxPostulantes(d.maxPostulantes()); l.setImagenUrl(d.imagenUrl());
        l.setFechaCierre(d.fechaCierre()); l.setEstado(el("Abierta"));
        if (d.archivoNombre() != null) {
            l.setArchivoNombre(d.archivoNombre()); l.setArchivoUrl("/archivos/" + d.archivoNombre());
            l.setTipoArchivo(tipos.findByNombre(d.tipoArchivo() == null ? "Otro" : d.tipoArchivo()).orElseGet(() -> tipos.findByNombre("Otro").orElse(null)));
        }
        return fila(lics.save(l));
    }

    @PutMapping("/licitaciones/{id}/estado") @Transactional
    public LicFila cambiarEstado(@PathVariable long id, @RequestBody Estado e) { Licitacion l = lic(id); l.setEstado(el(e.estado())); return fila(l); }

    /** Borra la licitación. Si en ese instante una Pyme postuló, la FK postulacion → licitacion lo impide (409). */
    @DeleteMapping("/licitaciones/{id}") @ResponseStatus(HttpStatus.NO_CONTENT) @Transactional
    public void eliminar(@PathVariable long id) {
        try { lics.delete(lic(id)); lics.flush(); }
        catch (DataIntegrityViolationException e) { throw ApiException.conflicto("Una Pyme acaba de postular a esta licitación, por lo que ya no se puede eliminar."); }
    }

    // ---------- postulacion ----------
    /** Filtradas por licitacionIds, pymeId (más reciente primero) o ids. */
    @GetMapping("/postulaciones")
    public List<PostFila> postulaciones(@RequestParam(required = false) List<Long> licitacionIds, @RequestParam(required = false) Long pymeId, @RequestParam(required = false) List<Long> ids) {
        List<Postulacion> l = ids != null ? posts.findAllById(ids) : pymeId != null ? posts.findByPymeIdOrderByFechaPostulacionDesc(pymeId)
                : licitacionIds != null ? licitacionIds.stream().flatMap(x -> posts.findByLicitacionId(x).stream()).toList() : posts.findAll();
        return l.stream().map(LicitacionesBdController::fila).toList();
    }

    @GetMapping("/postulaciones/{id}") public PostFila postulacion(@PathVariable long id) { return fila(post(id)); }

    /** Cuántas postulaciones hizo una Pyme desde una fecha (cupo mensual), o el total si no se indica la Pyme. */
    @GetMapping("/postulaciones/contar")
    public Map<String, Long> contar(@RequestParam(required = false) Long pymeId, @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate desde) {
        return Map.of("total", pymeId == null ? posts.count() : posts.countByPymeIdAndFechaPostulacionGreaterThanEqual(pymeId, desde == null ? LocalDate.EPOCH : desde));
    }

    /** Nueva postulación 'Pendiente'. La restricción única (licitacion_id, pyme_id) evita postular dos veces. */
    @PostMapping("/postulaciones") @Transactional
    public PostFila postular(@RequestBody NuevaPost d) {
        lic(d.licitacionId());
        Postulacion p = new Postulacion();
        p.setLicitacionId(d.licitacionId()); p.setPymeId(d.pymeId()); p.setMensaje(d.mensaje()); p.setEstado(ep("Pendiente"));
        try { return fila(posts.saveAndFlush(p)); }
        catch (DataIntegrityViolationException e) { throw ApiException.conflicto("Ya postulaste a esta licitación"); }
    }

    /**
     * Cambia el estado de una postulación en una sola transacción. ER: al aprobar una, la licitación pasa a 'Adjudicada'
     * y las demás postulaciones pendientes quedan 'Rechazada'.
     */
    @PostMapping("/postulaciones/{id}/decision") @Transactional
    public PostFila decidir(@PathVariable long id, @RequestBody Estado e) {
        Postulacion p = post(id);
        p.setEstado(ep(e.estado()));
        if ("Aprobada".equals(e.estado())) {
            Licitacion l = lic(p.getLicitacionId());
            l.setEstado(el("Adjudicada"));
            for (Postulacion o : posts.findByLicitacionId(l.getId()))
                if (!o.getId().equals(p.getId()) && "Pendiente".equals(o.getEstado().getNombre())) o.setEstado(ep("Rechazada"));
        }
        return fila(p);
    }

    /** Al eliminar una cuenta: sus licitaciones (con sus postulaciones) y sus postulaciones. */
    @DeleteMapping("/usuarios/{id}") @ResponseStatus(HttpStatus.NO_CONTENT) @Transactional
    public void eliminarUsuario(@PathVariable long id) {
        for (Licitacion l : lics.findByLicitadorIdOrderByCreatedAtDesc(id)) posts.deleteByLicitacionId(l.getId());
        lics.deleteByLicitadorId(id); posts.deleteByPymeId(id);
    }
}
