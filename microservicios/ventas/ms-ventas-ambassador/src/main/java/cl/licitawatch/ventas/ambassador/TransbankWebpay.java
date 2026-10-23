package cl.licitawatch.ventas.ambassador;

import com.fasterxml.jackson.databind.JsonNode;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.stereotype.Component;
import org.springframework.web.client.RestClient;

import java.util.Map;

/**
 * Webpay Plus (REST, ambiente de integración de Transbank).
 * IMPORTANTE: Webpay Plus real es un flujo con redirección (crear transacción → ir a la URL → volver con token_ws → confirmar).
 * Este adaptador implementa crear+confirmar; para usarlo el front debe redirigir al formulario de Transbank (no incluido en este MVP).
 * Mientras tanto, PASARELA_MODO=simulado reproduce el resultado sin salir de la aplicación.
 */
@Component
@ConditionalOnProperty(name = "lw.pasarela.modo", havingValue = "transbank")
public class TransbankWebpay implements PasarelaPago {
    private final RestClient http = RestClient.create();
    private final String base, codigo, clave, retorno;

    public TransbankWebpay(@Value("${lw.pasarela.tbk-url}") String base, @Value("${lw.pasarela.tbk-commerce-code}") String codigo,
                           @Value("${lw.pasarela.tbk-api-key}") String clave, @Value("${lw.pasarela.return-url}") String retorno) { this.base = base; this.codigo = codigo; this.clave = clave; this.retorno = retorno; }

    /** Paso 1: crea la transacción; devuelve token y URL de pago (se informan en 'detalle' como "token|url"). */
    @Override
    public Resultado cobrar(int monto, String metodo, String ordenCompra, boolean simularRechazo) {
        JsonNode r = http.post().uri(base + "/rswebpaytransaction/api/webpay/v1.2/transactions")
                .header("Tbk-Api-Key-Id", codigo).header("Tbk-Api-Key-Secret", clave)
                .body(Map.of("buy_order", ordenCompra, "session_id", ordenCompra, "amount", monto, "return_url", retorno))
                .retrieve().body(JsonNode.class);
        return new Resultado(false, r.get("token").asText(), r.get("token").asText() + "|" + r.get("url").asText());
    }

    /** Paso 2: confirma la transacción tras la redirección de vuelta. */
    public Resultado confirmar(String tokenWs) {
        JsonNode r = http.put().uri(base + "/rswebpaytransaction/api/webpay/v1.2/transactions/" + tokenWs)
                .header("Tbk-Api-Key-Id", codigo).header("Tbk-Api-Key-Secret", clave).retrieve().body(JsonNode.class);
        boolean ok = "AUTHORIZED".equals(r.path("status").asText()) && r.path("response_code").asInt(-1) == 0;
        return new Resultado(ok, r.path("buy_order").asText(tokenWs), r.path("status").asText());
    }
}
