package cl.licitawatch.common;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.core.ParameterizedTypeReference;
import org.springframework.stereotype.Component;
import org.springframework.web.client.RestClient;

import java.util.Map;

/**
 * Cliente REST para llamadas entre microservicios (rutas /internal/**).
 * Las referencias entre servicios (usuarioId, licitacionId…) se validan por REST, no por llaves foráneas.
 */
@Component
public class InternalClient {
    private final RestClient http = RestClient.create();
    private final String key;
    public InternalClient(@Value("${lw.internal-key}") String key) { this.key = key; }

    public <T> T get(String url, Class<T> tipo) {
        return http.get().uri(url).header("X-Internal-Key", key).retrieve().body(tipo);
    }

    public <T> T post(String url, Object body, Class<T> tipo) {
        return http.post().uri(url).header("X-Internal-Key", key).body(body).retrieve().body(tipo);
    }

    /** Notificación "dispara y olvida": nunca rompe el flujo principal. */
    public void notificar(String baseUrl, long usuarioId, String tipo, String titulo, String detalle, boolean correo) {
        try {
            http.post().uri(baseUrl + "/internal/notificaciones").header("X-Internal-Key", key)
                    .body(Map.of("usuarioId", usuarioId, "tipo", tipo, "titulo", titulo, "detalle", detalle, "enviarCorreo", correo))
                    .retrieve().toBodilessEntity();
        } catch (Exception ignorada) { /* el servicio de notificaciones puede estar caído */ }
    }

    public static final ParameterizedTypeReference<Map<String, Object>> MAPA = new ParameterizedTypeReference<>() {};
}
