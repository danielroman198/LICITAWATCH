package cl.licitawatch.chat.bd;

import jakarta.persistence.*;
import java.time.Instant;

@Entity @Table(name = "mensaje", indexes = @Index(name = "ix_msg_conv", columnList = "conversacion_id"))
public class Mensaje {
    @Id @GeneratedValue(strategy = GenerationType.IDENTITY) private Long id;
    @Column(name = "conversacion_id", nullable = false) private Long conversacionId;
    @Column(name = "emisor_id", nullable = false) private Long emisorId;
    @Column(nullable = false, length = 2000) private String contenido;
    @Column(name = "enviado_at", nullable = false) private Instant enviadoAt = Instant.now();
    @Column(nullable = false) private boolean leido;
    public Mensaje() {}
    public Mensaje(Long conversacionId, Long emisorId, String contenido) { this.conversacionId = conversacionId; this.emisorId = emisorId; this.contenido = contenido; }
    public Long getId() { return id; } public Long getConversacionId() { return conversacionId; } public Long getEmisorId() { return emisorId; }
    public String getContenido() { return contenido; } public Instant getEnviadoAt() { return enviadoAt; } public boolean isLeido() { return leido; } public void setLeido(boolean v) { leido = v; }
}
