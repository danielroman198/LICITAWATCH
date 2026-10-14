package cl.licitawatch.notificaciones.bd;

import org.springframework.data.jpa.repository.JpaRepository;
import java.util.Optional;

public interface TipoRepo extends JpaRepository<TipoNotificacion, Integer> { Optional<TipoNotificacion> findByNombre(String nombre); }
