package cl.licitawatch.asistente.ambassador;

import com.fasterxml.jackson.databind.JsonNode;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;
import org.springframework.web.client.RestClient;

import java.util.List;
import java.util.Map;
import java.util.Optional;

/** Ambassador hacia el LLM externo (Groq, API compatible con OpenAI). Si no hay API key o falla, devuelve vacío y se usa la heurística local. */
@Component
public class GroqClient {
    private final RestClient http = RestClient.create();
    private final String key, modelo, url;
    public GroqClient(@Value("${lw.groq.api-key}") String key, @Value("${lw.groq.modelo}") String modelo, @Value("${lw.groq.url}") String url) { this.key = key; this.modelo = modelo; this.url = url; }

    public Optional<String> responder(String sistema, String usuario) {
        if (key == null || key.isBlank()) return Optional.empty();
        try {
            JsonNode r = http.post().uri(url).header("Authorization", "Bearer " + key)
                    .body(Map.of("model", modelo, "temperature", 0.3, "max_tokens", 400,
                            "messages", List.of(Map.of("role", "system", "content", sistema), Map.of("role", "user", "content", usuario))))
                    .retrieve().body(JsonNode.class);
            return Optional.ofNullable(r.path("choices").path(0).path("message").path("content").asText(null));
        } catch (Exception e) { return Optional.empty(); }
    }
}
