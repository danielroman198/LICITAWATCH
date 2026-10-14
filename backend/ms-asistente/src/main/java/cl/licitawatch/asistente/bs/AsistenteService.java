package cl.licitawatch.asistente.bs;

import cl.licitawatch.asistente.ambassador.GroqClient;
import cl.licitawatch.common.ApiException;
import cl.licitawatch.common.InternalClient;
import com.fasterxml.jackson.databind.JsonNode;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import java.text.Normalizer;
import java.util.*;

/** LicitAsist: función Premium. Busca entre las licitaciones abiertas y redacta la respuesta (con Groq si hay API key). */
@Service
public class AsistenteService {
    public record Respuesta(String rol, String texto, List<JsonNode> licitaciones) {}
    private final InternalClient interno; private final GroqClient groq; private final String urlVentas, urlLicitaciones;

    public AsistenteService(InternalClient interno, GroqClient groq, @Value("${lw.urls.ventas}") String urlVentas, @Value("${lw.urls.licitaciones}") String urlLicitaciones) {
        this.interno = interno; this.groq = groq; this.urlVentas = urlVentas; this.urlLicitaciones = urlLicitaciones;
    }

    public Respuesta preguntar(long pymeId, String texto) {
        JsonNode sus = interno.get(urlVentas + "/internal/suscripciones/" + pymeId, JsonNode.class);
        if (!"Premium".equals(sus.path("plan").path("nombre").asText())) throw ApiException.prohibido("LicitAsist es una función del plan Premium");
        if (texto == null || texto.isBlank()) throw ApiException.invalido("Escribe tu consulta");

        String q = norm(texto);
        if (q.contains("cuantas postulaciones")) {
            int usadas = sus.path("postulacionesUsadas").asInt(), lim = sus.path("plan").path("postulacionesMes").asInt();
            return new Respuesta("asistente", "Llevas " + usadas + " de " + lim + " postulaciones este mes; te quedan " + Math.max(0, lim - usadas) + ".", List.of());
        }
        if (q.contains("como postulo") || q.contains("como postular"))
            return new Respuesta("asistente", "Entra a Explorar licitaciones, abre la que te interese y escribe un mensaje para el Licitador en el cuadro “Postular”. El Licitador la revisará y te avisaremos del resultado.", List.of());

        JsonNode abiertas = interno.get(urlLicitaciones + "/internal/licitaciones/abiertas", JsonNode.class);
        List<String> palabras = Arrays.stream(q.split("[^a-z0-9]+")).filter(w -> w.length() > 3 && !STOP.contains(w)).toList();
        List<Map.Entry<JsonNode, Integer>> puntuadas = new ArrayList<>();
        for (JsonNode l : abiertas) {
            String hay = norm(l.path("titulo").asText() + " " + l.path("descripcion").asText() + " " + l.path("licitadorNombre").asText());
            int p = (int) palabras.stream().filter(hay::contains).count();
            if (p > 0 || palabras.isEmpty()) puntuadas.add(Map.entry(l, p));
        }
        puntuadas.sort((a, b) -> b.getValue() - a.getValue());
        List<JsonNode> top = puntuadas.stream().limit(3).map(Map.Entry::getKey).toList();

        String base = top.isEmpty() ? "No encontré licitaciones abiertas que calcen con tu consulta. Prueba con otro rubro o región." : "Encontré " + top.size() + " licitación(es) abierta(s) que podrían interesarte:";
        if (!top.isEmpty()) {
            StringBuilder ctx = new StringBuilder();
            top.forEach(l -> ctx.append("- ").append(l.path("titulo").asText()).append(" (").append(l.path("licitadorNombre").asText()).append(")\n"));
            base = groq.responder("Eres LicitAsist, asistente de LicitaWatch (licitaciones B2B en Chile). Responde en español, en 2 frases como máximo, presentando estas licitaciones sin inventar datos.",
                    "Consulta: " + texto + "\nLicitaciones encontradas:\n" + ctx).orElse(base);
        }
        return new Respuesta("asistente", base, top);
    }

    private static final Set<String> STOP = Set.of("busca", "muestrame", "licitaciones", "licitacion", "quiero", "necesito", "para", "sobre", "dame", "cuales", "hay", "pronto", "cierran");
    private static String norm(String s) { return Normalizer.normalize(s.toLowerCase(), Normalizer.Form.NFD).replaceAll("\\p{M}", ""); }
}
