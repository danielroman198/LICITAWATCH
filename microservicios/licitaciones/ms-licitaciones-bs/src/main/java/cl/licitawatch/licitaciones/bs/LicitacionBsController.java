package cl.licitawatch.licitaciones.bs;

import cl.licitawatch.common.Auth;
import cl.licitawatch.common.Sesion;
import cl.licitawatch.licitaciones.bs.Dto.*;
import jakarta.servlet.http.HttpServletRequest;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

/** Capa BS de Licitaciones. /bs/** lo llama el BFF (con la sesión en cabeceras); /internal/** lo llaman las capas BS de otros dominios. */
@RestController
public class LicitacionBsController {
    private final LicitacionService svc;
    public LicitacionBsController(LicitacionService svc) { this.svc = svc; }

    @GetMapping("/bs/licitaciones")
    public List<LicitacionDto> buscar(@RequestParam(required = false) String q, @RequestParam(required = false) Integer rubroId, @RequestParam(required = false) Integer regionId,
                                      @RequestParam(required = false) String estado, @RequestParam(required = false) Long presupuestoMax) {
        return svc.buscar(q, rubroId, regionId, estado, presupuestoMax);
    }
    @GetMapping("/bs/licitaciones/mias") public List<LicitacionDto> mias(HttpServletRequest r) { return svc.mias(Auth.sesion(r).usuarioId()); }
    @GetMapping("/bs/licitaciones/todas") public List<LicitacionDto> todas() { return svc.todas(); }
    @GetMapping("/bs/licitaciones/{id}") public LicitacionDto obtener(@PathVariable long id) { return svc.obtener(id); }

    @PostMapping("/bs/licitaciones") @ResponseStatus(HttpStatus.CREATED)
    public LicitacionDto crear(HttpServletRequest r, @RequestBody NuevaLicitacion b) { return svc.crear(Auth.sesion(r).usuarioId(), b); }
    @DeleteMapping("/bs/licitaciones/{id}") @ResponseStatus(HttpStatus.NO_CONTENT)
    public void eliminar(HttpServletRequest r, @PathVariable long id) { svc.eliminar(id, Auth.sesion(r).usuarioId()); }
    @PostMapping("/bs/licitaciones/{id}/cerrar")
    public LicitacionDto cerrar(HttpServletRequest r, @PathVariable long id) { Sesion s = Auth.sesion(r); return svc.cerrar(id, s.usuarioId(), s.esAdmin()); }
    @GetMapping("/bs/licitaciones/{id}/postulantes")
    public List<PostulacionDto> postulantes(HttpServletRequest r, @PathVariable long id) { Sesion s = Auth.sesion(r); return svc.postulantes(id, s.usuarioId(), s.esAdmin()); }
    @PostMapping("/bs/licitaciones/{id}/postular") @ResponseStatus(HttpStatus.CREATED)
    public PostulacionDto postular(HttpServletRequest r, @PathVariable long id, @RequestBody Postular b) { return svc.postular(Auth.sesion(r).usuarioId(), id, b.mensaje()); }

    @GetMapping("/bs/resumen/licitador") public ResumenLicitador resumenL(HttpServletRequest r) { return svc.resumenLicitador(Auth.sesion(r).usuarioId()); }
    @GetMapping("/bs/resumen/pyme") public ResumenPyme resumenP(HttpServletRequest r) { return svc.resumenPyme(Auth.sesion(r).usuarioId()); }

    @GetMapping("/bs/postulaciones/mias") public List<PostulacionDto> misPostulaciones(HttpServletRequest r) { return svc.misPostulaciones(Auth.sesion(r).usuarioId()); }
    @PostMapping("/bs/postulaciones/{id}/decision")
    public PostulacionDto decision(HttpServletRequest r, @PathVariable long id, @RequestBody Decision b) { return svc.decidir(id, Auth.sesion(r).usuarioId(), b.estado()); }
    @PostMapping("/bs/postulaciones/{id}/adjudicar") public PostulacionDto adjudicar(HttpServletRequest r, @PathVariable long id) { return svc.adjudicar(id, Auth.sesion(r).usuarioId()); }

    // ---- servicio a servicio ----
    @GetMapping("/internal/postulaciones/usadas") public Map<String, Long> usadas(@RequestParam long usuarioId) { return Map.of("usadas", svc.usadasMes(usuarioId)); }
    @GetMapping("/internal/licitaciones/resumen") public Map<String, Object> resumen() { return svc.resumenGlobal(); }
    @GetMapping("/internal/licitaciones/abiertas") public List<LicitacionDto> abiertas() { return svc.buscar("", null, null, "Abierta", null); }
    @GetMapping("/internal/postulaciones/resumen") public List<Map<String, Object>> resumenPost(@RequestParam List<Long> ids) { return svc.resumenPostulaciones(ids); }
    @PostMapping("/internal/usuarios/{id}/eliminar") public void eliminar(@PathVariable long id) { svc.eliminarUsuario(id); }
}
