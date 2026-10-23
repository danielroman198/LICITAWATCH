package cl.licitawatch.notificaciones.bs;

import cl.licitawatch.common.InternalClient;
import com.fasterxml.jackson.databind.JsonNode;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.mail.SimpleMailMessage;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.stereotype.Service;

import java.time.Instant;
import java.util.ArrayList;
import java.util.List;

@Service
public class NotificacionService {
    private static final Logger log = LoggerFactory.getLogger(NotificacionService.class);
    private final InternalClient interno; private final JavaMailSender mail;
    private final String urlBd, urlUsuarios, remitente; private final boolean correoActivo;

    public NotificacionService(InternalClient interno, JavaMailSender mail, @Value("${lw.urls.bd}") String urlBd, @Value("${lw.urls.usuarios}") String urlUsuarios,
                               @Value("${lw.correo.remitente}") String remitente, @Value("${lw.correo.activo}") boolean correoActivo) {
        this.interno = interno; this.mail = mail; this.urlBd = urlBd; this.urlUsuarios = urlUsuarios; this.remitente = remitente; this.correoActivo = correoActivo;
    }

    public record NotificacionDto(Long id, String tipo, String titulo, String detalle, Instant createdAt, boolean leida) {}
    private record Fila(Long id, Long usuarioId, String tipo, String canal, Instant createdAt) {}

    private static final java.util.Map<String, String> TEXTO = java.util.Map.of(
            "Licitación publicada", "Tu licitación fue publicada y ya es visible para las Pymes.",
            "Postulación recibida", "Una Pyme postuló a una de tus licitaciones.",
            "Postulación aprobada", "Tu postulación fue aprobada y la licitación te fue adjudicada.",
            "Postulación rechazada", "Tu postulación no fue seleccionada.",
            "Pago confirmado", "Tu pago fue confirmado y tu suscripción está activa.",
            "Mensaje nuevo", "Tienes un mensaje nuevo en una de tus conversaciones.");

    /**
     * Un registro por evento importante (ER). Si el tipo no está en el catálogo (p. ej. "CORREO": bienvenida y recuperación de
     * contraseña) la capa BD no guarda fila y solo se envía el correo. El texto del correo lo entrega quien notifica; no se almacena.
     */
    public void crear(long usuarioId, String tipo, String titulo, String detalle, boolean enviarCorreo) {
        interno.post(urlBd + "/bd/notificaciones", java.util.Map.of("usuarioId", usuarioId, "tipo", tipo), JsonNode.class);
        if (enviarCorreo) enviarCorreo(usuarioId, titulo, detalle);
    }

    private void enviarCorreo(long usuarioId, String asunto, String cuerpo) {
        try {
            String para = interno.get(urlUsuarios + "/internal/usuarios/" + usuarioId + "/resumen", JsonNode.class).path("email").asText();
            if (!correoActivo) { log.info("[CORREO simulado] para={} asunto={} cuerpo={}", para, asunto, cuerpo); return; }
            SimpleMailMessage m = new SimpleMailMessage(); m.setFrom(remitente); m.setTo(para); m.setSubject(asunto); m.setText(cuerpo); mail.send(m);
        } catch (Exception e) { log.warn("No se pudo enviar el correo: {}", e.getMessage()); }
    }

    /** El ER no guarda "leída": el front lleva ese estado en el navegador. Aquí siempre se informa false. */
    public List<NotificacionDto> de(long usuarioId) {
        Fila[] filas = interno.get(urlBd + "/bd/notificaciones?usuarioId=" + usuarioId, Fila[].class);
        List<NotificacionDto> out = new ArrayList<>();
        for (Fila n : filas) out.add(new NotificacionDto(n.id(), n.tipo(), n.tipo(), TEXTO.getOrDefault(n.tipo(), ""), n.createdAt(), false));
        return out;
    }
}
