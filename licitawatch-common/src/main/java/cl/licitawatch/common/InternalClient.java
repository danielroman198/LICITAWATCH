package cl.licitawatch.common;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.core.ParameterizedTypeReference;
import org.springframework.http.HttpMethod;
import org.springframework.http.HttpStatus;
import org.springframework.http.HttpStatusCode;
import org.springframework.http.client.JdkClientHttpRequestFactory;
import org.springframework.stereotype.Component;
import org.springframework.web.client.RestClient;
import org.springframework.web.context.request.RequestAttributes;
import org.springframework.web.context.request.RequestContextHolder;

import java.io.InputStream;
import java.net.URI;
import java.net.URLEncoder;
import java.nio.charset.StandardCharsets;
import java.util.Map;

/**
 * Cliente REST para llamadas entre capas y entre microservicios: BFF → BS, BS → BD, BS → Ambassador y BS → BS de otro dominio
 * (rutas /bs/**, /bd/**, /ambassador/** e /internal/**, protegidas con la cabecera X-Internal-Key).
 * <ul>
 *   <li>Si la petición actual tiene sesión, la reenvía en X-Usuario-Id / X-Usuario-Rol (la capa BS sabe quién llama sin volver a validar el JWT).</li>
 *   <li>Si la capa llamada responde con error, se relanza como {@link ApiException} con el mismo código y mensaje, para que llegue tal cual al front.</li>
 * </ul>
 * Las referencias entre servicios (usuarioId, licitacionId…) se validan por REST, no por llaves foráneas.
 */
@Component
public class InternalClient {
    public static final String H_KEY = "X-Internal-Key", H_USUARIO = "X-Usuario-Id", H_ROL = "X-Usuario-Rol";
    private final RestClient http;
    private final String key;
    private final ObjectMapper json;

    public InternalClient(RestClient.Builder builder, ObjectMapper json, @Value("${lw.internal-key}") String key) {
        // Cliente HTTP de Java 11+ (java.net.http): a diferencia de HttpURLConnection, permite leer el cuerpo de las respuestas 401.
        this.http = builder.requestFactory(new JdkClientHttpRequestFactory()).build(); this.json = json; this.key = key;
    }

    public <T> T get(String url, Class<T> tipo) { return llamar(HttpMethod.GET, url, null).body(tipo); }
    public <T> T get(String url, ParameterizedTypeReference<T> tipo) { return llamar(HttpMethod.GET, url, null).body(tipo); }
    public <T> T post(String url, Object body, Class<T> tipo) { return llamar(HttpMethod.POST, url, body).body(tipo); }
    public <T> T post(String url, Object body, ParameterizedTypeReference<T> tipo) { return llamar(HttpMethod.POST, url, body).body(tipo); }
    public <T> T put(String url, Object body, Class<T> tipo) { return llamar(HttpMethod.PUT, url, body).body(tipo); }
    public <T> T patch(String url, Object body, Class<T> tipo) { return llamar(HttpMethod.PATCH, url, body).body(tipo); }
    public void delete(String url) { llamar(HttpMethod.DELETE, url, null).toBodilessEntity(); }

    /** Para el BFF: reenvía la petición a la capa BS y devuelve su JSON tal cual (null si respondió sin cuerpo). */
    public JsonNode reenviar(HttpMethod metodo, String url, Object body) { return llamar(metodo, url, body).body(JsonNode.class); }

    private RestClient.ResponseSpec llamar(HttpMethod metodo, String url, Object body) {
        // La URL ya viene codificada (los textos libres se codifican con URLEncoder al armarla): se usa tal cual, sin recodificar.
        RestClient.RequestBodySpec req = http.method(metodo).uri(URI.create(url)).header(H_KEY, key);
        Sesion s = sesionActual();
        if (s != null) req.header(H_USUARIO, String.valueOf(s.usuarioId())).header(H_ROL, s.rol());
        if (body != null) req.body(body);
        return req.retrieve().onStatus(HttpStatusCode::isError, (pet, res) -> {
            String mensaje = "Error en el servicio";
            try (InputStream in = res.getBody()) { mensaje = json.readTree(in).path("mensaje").asText(mensaje); } catch (Exception ignorada) { }
            HttpStatus st = HttpStatus.resolve(res.getStatusCode().value());
            throw new ApiException(st != null ? st : HttpStatus.BAD_GATEWAY, mensaje);
        });
    }

    private static Sesion sesionActual() {
        RequestAttributes a = RequestContextHolder.getRequestAttributes();
        return a == null ? null : (Sesion) a.getAttribute(JwtAuthFilter.ATTR, RequestAttributes.SCOPE_REQUEST);
    }

    /** Notificación "dispara y olvida": nunca rompe el flujo principal. baseUrl = capa BS de Notificaciones. */
    public void notificar(String baseUrl, long usuarioId, String tipo, String titulo, String detalle, boolean correo) {
        try {
            post(baseUrl + "/internal/notificaciones", Map.of("usuarioId", usuarioId, "tipo", tipo, "titulo", titulo, "detalle", detalle, "enviarCorreo", correo), Void.class);
        } catch (Exception ignorada) { /* el servicio de notificaciones puede estar caído */ }
    }

    /** Codifica un texto libre (correo, búsqueda…) para usarlo como valor en la query de una URL. */
    public static String q(String valor) { return URLEncoder.encode(valor == null ? "" : valor, StandardCharsets.UTF_8); }

    public static final ParameterizedTypeReference<Map<String, Object>> MAPA = new ParameterizedTypeReference<>() {};
}
