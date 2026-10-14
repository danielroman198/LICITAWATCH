package cl.licitawatch.notificaciones.bs;

import cl.licitawatch.common.InternalClient;
import cl.licitawatch.notificaciones.bd.*;
import com.fasterxml.jackson.databind.JsonNode;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.mail.SimpleMailMessage;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Service
public class NotificacionService {
    private static final Logger log = LoggerFactory.getLogger(NotificacionService.class);
    private final NotificacionRepo repo; private final TipoRepo tipos; private final InternalClient interno; private final JavaMailSender mail;
    private final String urlUsuarios, remitente; private final boolean correoActivo;

    public NotificacionService(NotificacionRepo repo, TipoRepo tipos, InternalClient interno, JavaMailSender mail, @Value("${lw.urls.usuarios}") String urlUsuarios,
                               @Value("${lw.correo.remitente}") String remitente, @Value("${lw.correo.activo}") boolean correoActivo) {
        this.repo = repo; this.tipos = tipos; this.interno = interno; this.mail = mail; this.urlUsuarios = urlUsuarios; this.remitente = remitente; this.correoActivo = correoActivo;
    }

    public record NotificacionDto(Long id, String tipo, String titulo, String detalle, java.time.Instant createdAt, boolean leida) {}

    private static final java.util.Map<String, String> TEXTO = java.util.Map.of(
            "Licitación publicada", "Tu licitación fue publicada y ya es visible para las Pymes.",
            "Postulación recibida", "Una Pyme postuló a una de tus licitaciones.",
            "Postulación aprobada", "Tu postulación fue aprobada y la licitación te fue adjudicada.",
            "Postulación rechazada", "Tu postulación no fue seleccionada.",
            "Pago confirmado", "Tu pago fue confirmado y tu suscripción está activa.",
            "Mensaje nuevo", "Tienes un mensaje nuevo en una de tus conversaciones.");

    /**
     * Un registro por evento importante (ER). Si el tipo no está en el catálogo (p. ej. "CORREO": bienvenida y recuperación de
     * contraseña) no se guarda fila y solo se envía el correo. El texto del correo lo entrega quien notifica; no se almacena.
     */
    @Transactional
    public void crear(long usuarioId, String tipo, String titulo, String detalle, boolean enviarCorreo) {
        tipos.findByNombre(tipo).ifPresent(t -> { Notificacion n = new Notificacion(); n.setUsuarioId(usuarioId); n.setTipo(t); repo.save(n); });
        if (enviarCorreo) enviarCorreo(usuarioId, titulo, detalle);
    }

    private void enviarCorreo(long usuarioId, String asunto, String cuerpo) {
        try {
            String para = interno.get(urlUsuarios + "/internal/usuarios/" + usuarioId + "/resumen", JsonNode.class).path("email").asText();
            if (!correoActivo) { log.info("[CORREO simulado] para={} asunto={} cuerpo={}", para, asunto, cuerpo); return; }
            SimpleMailMessage m = new SimpleMailMessage(); m.setFrom(remitente); m.setTo(para); m.setSubject(asunto); m.setText(cuerpo); mail.send(m);
        } catch (Exception e) { log.warn("No se pudo enviar el correo: {}", e.getMessage()); }
    }

    /** El ER no guarda "leída": el front lleva ese estado en el navegador (último id visto). Aquí siempre se informa false. */
    public List<NotificacionDto> de(long usuarioId) {
        return repo.findTop50ByUsuarioIdOrderByIdDesc(usuarioId).stream()
                .map(n -> new NotificacionDto(n.getId(), n.getTipo().getNombre(), n.getTipo().getNombre(), TEXTO.getOrDefault(n.getTipo().getNombre(), ""), n.getCreatedAt(), false)).toList();
    }
}
