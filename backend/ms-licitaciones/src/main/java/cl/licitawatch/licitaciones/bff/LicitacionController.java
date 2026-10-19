package cl.licitawatch.licitaciones.bff;

import cl.licitawatch.common.Auth;
import cl.licitawatch.common.Sesion;
import cl.licitawatch.licitaciones.bff.Dto.*;
import cl.licitawatch.licitaciones.bs.LicitacionService;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
public class LicitacionController {
    private final LicitacionService svc;
    public LicitacionController(LicitacionService svc) { this.svc = svc; }

    @GetMapping("/api/licitaciones")
    public List<LicitacionDto> buscar(HttpServletRequest r, @RequestParam(required = false) String q, @RequestParam(required = false) Integer rubroId, @RequestParam(required = false) Integer regionId,
                                      @RequestParam(required = false) String estado, @RequestParam(required = false) Long presupuestoMax) {
        Auth.sesion(r); return svc.buscar(q, rubroId, regionId, estado, presupuestoMax);
    }
    @GetMapping("/api/licitaciones/mias") public List<LicitacionDto> mias(HttpServletRequest r) { return svc.mias(Auth.exigir(r, "LICITADOR").usuarioId()); }
    @GetMapping("/api/licitaciones/{id}") public LicitacionDto obtener(HttpServletRequest r, @PathVariable long id) { Auth.sesion(r); return svc.obtener(id); }

    @PostMapping("/api/licitaciones") @ResponseStatus(HttpStatus.CREATED)
    public LicitacionDto crear(HttpServletRequest r, @Valid @RequestBody NuevaLicitacion b) { return svc.crear(Auth.exigir(r, "LICITADOR").usuarioId(), b); }

    @DeleteMapping("/api/licitaciones/{id}") @ResponseStatus(HttpStatus.NO_CONTENT)
    public void eliminar(HttpServletRequest r, @PathVariable long id) { svc.eliminar(id, Auth.exigir(r, "LICITADOR").usuarioId()); }

    @PostMapping("/api/licitaciones/{id}/cerrar")
    public LicitacionDto cerrar(HttpServletRequest r, @PathVariable long id) { Sesion s = Auth.exigir(r, "LICITADOR", "ADMIN"); return svc.cerrar(id, s.usuarioId(), s.esAdmin()); }

    @GetMapping("/api/licitaciones/{id}/postulantes")
    public List<PostulacionDto> postulantes(HttpServletRequest r, @PathVariable long id) { Sesion s = Auth.exigir(r, "LICITADOR", "ADMIN"); return svc.postulantes(id, s.usuarioId(), s.esAdmin()); }

    @PostMapping("/api/licitaciones/{id}/postular") @ResponseStatus(HttpStatus.CREATED)
    public PostulacionDto postular(HttpServletRequest r, @PathVariable long id, @RequestBody Postular b) { return svc.postular(Auth.exigir(r, "PYME").usuarioId(), id, b.mensaje()); }

    @GetMapping("/api/licitaciones/resumen/licitador") public ResumenLicitador resumenL(HttpServletRequest r) { return svc.resumenLicitador(Auth.exigir(r, "LICITADOR").usuarioId()); }
    @GetMapping("/api/licitaciones/resumen/pyme") public ResumenPyme resumenP(HttpServletRequest r) { return svc.resumenPyme(Auth.exigir(r, "PYME").usuarioId()); }

    @GetMapping("/api/postulaciones/mias") public List<PostulacionDto> misPostulaciones(HttpServletRequest r) { return svc.misPostulaciones(Auth.exigir(r, "PYME").usuarioId()); }
    @PostMapping("/api/postulaciones/{id}/decision")
    public PostulacionDto decision(HttpServletRequest r, @PathVariable long id, @Valid @RequestBody Decision b) { return svc.decidir(id, Auth.exigir(r, "LICITADOR").usuarioId(), b.estado()); }
    @PostMapping("/api/postulaciones/{id}/adjudicar") public PostulacionDto adjudicar(HttpServletRequest r, @PathVariable long id) { return svc.adjudicar(id, Auth.exigir(r, "LICITADOR").usuarioId()); }

    @GetMapping("/api/admin/licitaciones") public List<LicitacionDto> admin(HttpServletRequest r) { Auth.exigir(r, "ADMIN"); return svc.todas(); }

    // ---- servicio a servicio ----
    @GetMapping("/internal/postulaciones/usadas") public Map<String, Long> usadas(@RequestParam long usuarioId) { return Map.of("usadas", svc.usadasMes(usuarioId)); }
    @GetMapping("/internal/licitaciones/resumen") public Map<String, Object> resumen() { return svc.resumenGlobal(); }
    @GetMapping("/internal/licitaciones/abiertas") public List<LicitacionDto> abiertas() { return svc.buscar("", null, null, "Abierta", null); }
    @GetMapping("/internal/postulaciones/resumen") public List<Map<String, Object>> resumenPost(@RequestParam List<Long> ids) { return svc.resumenPostulaciones(ids); }
    @PostMapping("/internal/usuarios/{id}/eliminar") public void eliminar(@PathVariable long id) { svc.eliminarUsuario(id); }
}
