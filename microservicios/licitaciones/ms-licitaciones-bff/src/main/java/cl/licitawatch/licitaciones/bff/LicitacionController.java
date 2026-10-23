package cl.licitawatch.licitaciones.bff;

import cl.licitawatch.common.Auth;
import cl.licitawatch.common.InternalClient;
import com.fasterxml.jackson.databind.JsonNode;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.validation.Valid;
import jakarta.validation.constraints.*;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpMethod;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.util.UriComponentsBuilder;

import java.time.Instant;
import java.util.List;

/** BFF de Licitaciones: valida la sesión, el rol y el formato de los datos de entrada, y delega en la capa BS. */
@RestController
public class LicitacionController {
    public record DocumentoDto(@NotBlank String nombre, String tipo, int tamanoKb) {}
    public record NuevaLicitacion(@NotBlank @Size(max = 160) String titulo, @NotBlank String descripcion, @NotNull Integer rubroId, @NotNull Integer regionId,
                                  Long presupuestoMin, Long presupuestoMax, Integer maxPostulantes, String imagenUrl, List<@Valid DocumentoDto> documentos, @NotNull Instant fechaCierre) {}
    public record Postular(String mensaje) {}
    public record Decision(@NotBlank String estado) {}

    private final InternalClient bs; private final String urlBs;
    public LicitacionController(InternalClient bs, @Value("${lw.urls.bs}") String urlBs) { this.bs = bs; this.urlBs = urlBs; }

    private JsonNode get(String ruta) { return bs.get(urlBs + ruta, JsonNode.class); }
    private JsonNode post(String ruta, Object body) { return bs.post(urlBs + ruta, body, JsonNode.class); }

    @GetMapping("/api/licitaciones")
    public JsonNode buscar(HttpServletRequest r, @RequestParam(required = false) String q, @RequestParam(required = false) Integer rubroId, @RequestParam(required = false) Integer regionId,
                           @RequestParam(required = false) String estado, @RequestParam(required = false) Long presupuestoMax) {
        Auth.sesion(r);
        String url = UriComponentsBuilder.fromHttpUrl(urlBs + "/bs/licitaciones").queryParamIfPresent("q", java.util.Optional.ofNullable(q))
                .queryParamIfPresent("rubroId", java.util.Optional.ofNullable(rubroId)).queryParamIfPresent("regionId", java.util.Optional.ofNullable(regionId))
                .queryParamIfPresent("estado", java.util.Optional.ofNullable(estado)).queryParamIfPresent("presupuestoMax", java.util.Optional.ofNullable(presupuestoMax))
                .encode().toUriString();
        return bs.get(url, JsonNode.class);
    }
    @GetMapping("/api/licitaciones/mias") public JsonNode mias(HttpServletRequest r) { Auth.exigir(r, "LICITADOR"); return get("/bs/licitaciones/mias"); }
    @GetMapping("/api/licitaciones/{id}") public JsonNode obtener(HttpServletRequest r, @PathVariable long id) { Auth.sesion(r); return get("/bs/licitaciones/" + id); }

    @PostMapping("/api/licitaciones") @ResponseStatus(HttpStatus.CREATED)
    public JsonNode crear(HttpServletRequest r, @Valid @RequestBody NuevaLicitacion b) { Auth.exigir(r, "LICITADOR"); return post("/bs/licitaciones", b); }

    @DeleteMapping("/api/licitaciones/{id}") @ResponseStatus(HttpStatus.NO_CONTENT)
    public void eliminar(HttpServletRequest r, @PathVariable long id) { Auth.exigir(r, "LICITADOR"); bs.reenviar(HttpMethod.DELETE, urlBs + "/bs/licitaciones/" + id, null); }

    @PostMapping("/api/licitaciones/{id}/cerrar")
    public JsonNode cerrar(HttpServletRequest r, @PathVariable long id) { Auth.exigir(r, "LICITADOR", "ADMIN"); return post("/bs/licitaciones/" + id + "/cerrar", null); }

    @GetMapping("/api/licitaciones/{id}/postulantes")
    public JsonNode postulantes(HttpServletRequest r, @PathVariable long id) { Auth.exigir(r, "LICITADOR", "ADMIN"); return get("/bs/licitaciones/" + id + "/postulantes"); }

    @PostMapping("/api/licitaciones/{id}/postular") @ResponseStatus(HttpStatus.CREATED)
    public JsonNode postular(HttpServletRequest r, @PathVariable long id, @RequestBody Postular b) { Auth.exigir(r, "PYME"); return post("/bs/licitaciones/" + id + "/postular", b); }

    @GetMapping("/api/licitaciones/resumen/licitador") public JsonNode resumenL(HttpServletRequest r) { Auth.exigir(r, "LICITADOR"); return get("/bs/resumen/licitador"); }
    @GetMapping("/api/licitaciones/resumen/pyme") public JsonNode resumenP(HttpServletRequest r) { Auth.exigir(r, "PYME"); return get("/bs/resumen/pyme"); }

    @GetMapping("/api/postulaciones/mias") public JsonNode misPostulaciones(HttpServletRequest r) { Auth.exigir(r, "PYME"); return get("/bs/postulaciones/mias"); }
    @PostMapping("/api/postulaciones/{id}/decision")
    public JsonNode decision(HttpServletRequest r, @PathVariable long id, @Valid @RequestBody Decision b) { Auth.exigir(r, "LICITADOR"); return post("/bs/postulaciones/" + id + "/decision", b); }
    @PostMapping("/api/postulaciones/{id}/adjudicar") public JsonNode adjudicar(HttpServletRequest r, @PathVariable long id) { Auth.exigir(r, "LICITADOR"); return post("/bs/postulaciones/" + id + "/adjudicar", null); }

    @GetMapping("/api/admin/licitaciones") public JsonNode admin(HttpServletRequest r) { Auth.exigir(r, "ADMIN"); return get("/bs/licitaciones/todas"); }
}
