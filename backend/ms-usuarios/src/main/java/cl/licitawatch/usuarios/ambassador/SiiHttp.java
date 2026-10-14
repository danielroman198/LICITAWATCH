package cl.licitawatch.usuarios.ambassador;

import cl.licitawatch.common.ApiException;
import cl.licitawatch.usuarios.bs.Rut;
import com.fasterxml.jackson.databind.JsonNode;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Component;
import org.springframework.web.client.HttpClientErrorException;
import org.springframework.web.client.RestClient;

/**
 * Consulta real a un proveedor de datos del SII (p. ej. un servicio de consulta de contribuyentes).
 * Se activa con SII_MODO=http y SII_URL / SII_API_KEY. El contrato esperado del proveedor es
 * GET {url}/{rut} → {"razonSocial","giro","estado","inicioActividades"}; adáptalo en {@link #consultar} si tu proveedor difiere.
 */
@Component
@ConditionalOnProperty(name = "lw.sii.modo", havingValue = "http")
public class SiiHttp implements SiiAmbassador {
    private final RestClient http = RestClient.create();
    private final String url, apiKey;

    public SiiHttp(@Value("${lw.sii.url}") String url, @Value("${lw.sii.api-key:}") String apiKey) { this.url = url; this.apiKey = apiKey; }

    @Override
    public ConsultaSii consultar(String rut) {
        if (!Rut.valido(rut)) throw ApiException.invalido("El RUT no es válido (dígito verificador incorrecto)");
        try {
            JsonNode n = http.get().uri(url + "/" + Rut.formatear(rut)).header("Authorization", "Bearer " + apiKey).retrieve().body(JsonNode.class);
            if (n == null || !n.hasNonNull("razonSocial")) throw ApiException.noEncontrado("El SII no registra este RUT como empresa");
            return new ConsultaSii(Rut.formatear(rut), n.get("razonSocial").asText(), n.path("giro").asText(""), n.path("estado").asText("Vigente"), n.path("inicioActividades").asText(""), false);
        } catch (HttpClientErrorException.NotFound e) {
            throw ApiException.noEncontrado("El SII no registra este RUT como empresa");
        } catch (ApiException e) { throw e;
        } catch (Exception e) {
            throw new ApiException(HttpStatus.SERVICE_UNAVAILABLE, "No pudimos consultar el SII en este momento");
        }
    }
}
