package cl.licitawatch.chat.bd;

import jakarta.persistence.*;
import java.time.Instant;

/** Tabla conversacion (ER): una por postulación (postulacion_id UQ). postulacion_id, licitador_id y pyme_id son REF (sin FK). */
@Entity @Table(name = "conversacion", uniqueConstraints = @UniqueConstraint(name = "uq_conv_postulacion", columnNames = "postulacion_id"))
public class Conversacion {
    @Id @GeneratedValue(strategy = GenerationType.IDENTITY) private Long id;
    @Column(name = "postulacion_id", nullable = false) private Long postulacionId;
    @Column(name = "licitador_id", nullable = false) private Long licitadorId;
    @Column(name = "pyme_id", nullable = false) private Long pymeId;
    @Column(name = "created_at", nullable = false) private Instant createdAt = Instant.now();
    // "Eliminar conversación" es solo para quien la elimina: se guarda cuándo. Para esa persona la conversación y los mensajes
    // anteriores a esa fecha dejan de existir; si llega un mensaje nuevo, reaparece solo con lo posterior. NULL = nunca la eliminó.
    @Column(name = "borrada_licitador_at") private Instant borradaLicitadorAt;
    @Column(name = "borrada_pyme_at") private Instant borradaPymeAt;
    public Long getId() { return id; } public Long getPostulacionId() { return postulacionId; } public void setPostulacionId(Long v) { postulacionId = v; }
    public Long getLicitadorId() { return licitadorId; } public void setLicitadorId(Long v) { licitadorId = v; }
    public Long getPymeId() { return pymeId; } public void setPymeId(Long v) { pymeId = v; }
    public Instant getCreatedAt() { return createdAt; }
    public Instant getBorradaLicitadorAt() { return borradaLicitadorAt; } public Instant getBorradaPymeAt() { return borradaPymeAt; }

    public void borrarPara(long usuarioId, Instant cuando) { if (licitadorId.equals(usuarioId)) borradaLicitadorAt = cuando; else borradaPymeAt = cuando; }
}
