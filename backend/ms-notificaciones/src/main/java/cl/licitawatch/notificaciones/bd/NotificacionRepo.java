package cl.licitawatch.notificaciones.bd;

import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;

public interface NotificacionRepo extends JpaRepository<Notificacion, Long> {
    List<Notificacion> findTop50ByUsuarioIdOrderByIdDesc(Long usuarioId);
}
