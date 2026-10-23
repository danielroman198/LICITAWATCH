package cl.licitawatch.usuarios.bff;

import cl.licitawatch.common.InternalClient;
import com.fasterxml.jackson.databind.JsonNode;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.web.bind.annotation.*;

import static cl.licitawatch.common.InternalClient.q;

/** BFF público (sin sesión): consulta del RUT al SII durante el registro y catálogos del ER. */
@RestController
public class SiiCatalogoController {
    private final InternalClient bs; private final String urlBs;
    public SiiCatalogoController(InternalClient bs, @Value("${lw.urls.bs}") String urlBs) { this.bs = bs; this.urlBs = urlBs; }

    private JsonNode get(String ruta) { return bs.get(urlBs + ruta, JsonNode.class); }

    @GetMapping("/api/sii/{rut}") public JsonNode consultar(@PathVariable String rut) { return get("/bs/sii/" + q(rut)); }

    @GetMapping("/api/catalogos/rubros") public JsonNode rubros() { return get("/bs/catalogos/rubros"); }
    @GetMapping("/api/catalogos/regiones") public JsonNode regiones() { return get("/bs/catalogos/regiones"); }
    @GetMapping("/api/catalogos/tamanos") public JsonNode tamanos() { return get("/bs/catalogos/tamanos"); }
    @GetMapping("/api/catalogos/ciudades")
    public JsonNode ciudades(@RequestParam(required = false) Integer regionId) { return get("/bs/catalogos/ciudades" + (regionId == null ? "" : "?regionId=" + regionId)); }
}
