package cl.licitawatch.chat.bd;

import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;
import java.util.Optional;

public final class Repos {
    private Repos() {}
    public interface ConversacionRepo extends JpaRepository<Conversacion, Long> {
        List<Conversacion> findByLicitadorIdOrPymeId(Long licitadorId, Long pymeId);
        Optional<Conversacion> findByPostulacionId(Long postulacionId);
        List<Conversacion> findByPostulacionIdIn(java.util.Collection<Long> postulacionIds);
    }
    public interface MensajeRepo extends JpaRepository<Mensaje, Long> {
        Optional<Mensaje> findFirstByConversacionIdOrderByEnviadoAtDesc(Long conversacionId);
        List<Mensaje> findByConversacionIdAndEnviadoAtAfterOrderByEnviadoAtAsc(Long conversacionId, java.time.Instant desde);
        long countByConversacionIdAndEmisorIdNotAndLeidoFalseAndEnviadoAtAfter(Long conversacionId, Long emisorId, java.time.Instant desde);
    }
}
