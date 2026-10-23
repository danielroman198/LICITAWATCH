package cl.licitawatch.ventas.ambassador;

import cl.licitawatch.common.ApiException;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.client.JdkClientHttpRequestFactory;
import org.springframework.stereotype.Component;
import org.springframework.web.client.RestClient;
import org.springframework.web.client.RestClientResponseException;

import java.net.http.HttpClient;
import java.time.Duration;
import java.util.Map;
import java.util.function.Supplier;

/**
 * Cliente de Webpay Plus (API REST v1.2 de Transbank). Flujo real con redirección:
 *  1. crear: Transbank entrega token + URL de su formulario de pago.
 *  2. El navegador del usuario va a esa URL (POST con token_ws), paga ahí y Transbank lo devuelve a return_url.
 *  3. confirmar (commit): solo después de esto el cobro queda hecho; la respuesta trae el resultado autorizado o rechazado.
 * Por defecto usa el ambiente de integración (credenciales públicas de prueba de Transbank); en producción se cambian por variables de entorno.
 */
@Component
public class TransbankWebpay {
    private static final Logger log = LoggerFactory.getLogger(TransbankWebpay.class);
    private static final String API = "/rswebpaytransaction/api/webpay/v1.2/transactions";

    public record Transaccion(String token, String url) {}
    /** Resultado de Transbank. tipoPago: VD débito, VP prepago, VN/VC/SI/S2/NC crédito. ultimos4: los únicos dígitos de la tarjeta que entrega Transbank. */
    public record Resultado(boolean aprobado, String estado, int codigoRespuesta, String ordenCompra, String sesionId, long monto,
                            String codigoAutorizacion, String tipoPago, int cuotas, String ultimos4, String fechaTransaccion) {}

    private final RestClient http;
    private final ObjectMapper json = new ObjectMapper();
    private final String retorno;

    public TransbankWebpay(@Value("${lw.webpay.url}") String base, @Value("${lw.webpay.codigo-comercio}") String codigo,
                           @Value("${lw.webpay.api-key}") String clave, @Value("${lw.webpay.retorno}") String retorno) {
        var cliente = HttpClient.newBuilder().connectTimeout(Duration.ofSeconds(10)).build();
        var fabrica = new JdkClientHttpRequestFactory(cliente); fabrica.setReadTimeout(Duration.ofSeconds(30));
        this.http = RestClient.builder().baseUrl(base + API).requestFactory(fabrica)
                .defaultHeader("Tbk-Api-Key-Id", codigo).defaultHeader("Tbk-Api-Key-Secret", clave).build();
        this.retorno = retorno;
    }

    /** Paso 1. buy_order: máx. 26 caracteres; session_id: máx. 61. */
    public Transaccion crear(long monto, String ordenCompra, String sesionId) {
        JsonNode r = llamar(() -> http.post().contentType(MediaType.APPLICATION_JSON)
                .body(Map.of("buy_order", ordenCompra, "session_id", sesionId, "amount", monto, "return_url", retorno)).retrieve().body(JsonNode.class));
        log.info("Webpay: transacción creada orden={} monto={}", ordenCompra, monto);
        return new Transaccion(r.path("token").asText(), r.path("url").asText());
    }

    /** Paso 3 (commit). Solo se puede confirmar una vez por token; Transbank responde 422 si ya se confirmó o si expiró. */
    public Resultado confirmar(String token) {
        Resultado r = resultado(llamar(() -> http.put().uri("/{token}", token).retrieve().body(JsonNode.class)));
        log.info("Webpay: confirmación orden={} estado={} código={}", r.ordenCompra(), r.estado(), r.codigoRespuesta());
        return r;
    }

    /** Consulta el estado de una transacción (sirve para saber qué pasó si la confirmación ya se hizo antes). */
    public Resultado estado(String token) { return resultado(llamar(() -> http.get().uri("/{token}", token).retrieve().body(JsonNode.class))); }

    private static Resultado resultado(JsonNode r) {
        boolean ok = "AUTHORIZED".equals(r.path("status").asText()) && r.path("response_code").asInt(-1) == 0;
        return new Resultado(ok, r.path("status").asText(), r.path("response_code").asInt(-1), r.path("buy_order").asText(), r.path("session_id").asText(),
                r.path("amount").asLong(), r.path("authorization_code").asText(""), r.path("payment_type_code").asText(""),
                r.path("installments_number").asInt(0), r.path("card_detail").path("card_number").asText(""), r.path("transaction_date").asText(""));
    }

    /** Errores de Transbank: 4xx con {"error_message": "..."} → 422 con ese texto; sin respuesta → 502. */
    private JsonNode llamar(Supplier<JsonNode> f) {
        try { return f.get(); }
        catch (RestClientResponseException e) {
            String msg = e.getResponseBodyAsString();
            try { msg = json.readTree(msg).path("error_message").asText(msg); } catch (Exception ignored) { /* cuerpo no JSON */ }
            log.warn("Webpay respondió {}: {}", e.getStatusCode().value(), msg);
            throw new ApiException(e.getStatusCode().is4xxClientError() ? HttpStatus.UNPROCESSABLE_ENTITY : HttpStatus.BAD_GATEWAY, "Webpay: " + msg);
        } catch (Exception e) {
            log.warn("Webpay no respondió: {}", e.toString());
            throw new ApiException(HttpStatus.BAD_GATEWAY, "No pudimos conectar con Webpay (Transbank). Revisa tu conexión a internet e inténtalo de nuevo.");
        }
    }
}
