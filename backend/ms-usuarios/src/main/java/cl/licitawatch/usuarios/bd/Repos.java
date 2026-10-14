package cl.licitawatch.usuarios.bd;

import cl.licitawatch.usuarios.bd.Catalogos.*;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;
import java.util.Optional;

public final class Repos {
    private Repos() {}
    public interface RolRepo extends JpaRepository<Rol, Integer> { Optional<Rol> findByNombre(String nombre); }
    public interface UsuarioRepo extends JpaRepository<Usuario, Long> {
        Optional<Usuario> findByEmailIgnoreCase(String email);
        boolean existsByEmailIgnoreCase(String email);
        long countByRol_Nombre(String rol);
        long countByActivoFalse();
    }
    public interface AdministradorRepo extends JpaRepository<Administrador, Long> { Optional<Administrador> findByUsuarioId(Long usuarioId); void deleteByUsuarioId(Long usuarioId); }
    public interface LicitadorRepo extends JpaRepository<Licitador, Long> { Optional<Licitador> findByUsuarioId(Long usuarioId); boolean existsByRut(String rut); boolean existsByRutPersona(String rutPersona); void deleteByUsuarioId(Long usuarioId); }
    public interface PymeRepo extends JpaRepository<Pyme, Long> { Optional<Pyme> findByUsuarioId(Long usuarioId); boolean existsByRut(String rut); boolean existsByRutPersona(String rutPersona); void deleteByUsuarioId(Long usuarioId); }
    public interface RubroRepo extends JpaRepository<Rubro, Integer> { List<Rubro> findAllByOrderByNombre(); }
    public interface RegionRepo extends JpaRepository<Region, Integer> { List<Region> findAllByOrderByNombre(); }
    public interface CiudadRepo extends JpaRepository<Ciudad, Integer> { List<Ciudad> findAllByOrderByNombre(); List<Ciudad> findByRegionIdOrderByNombre(Integer regionId); }
    public interface TamanoRepo extends JpaRepository<TamanoEmpresa, Integer> { List<TamanoEmpresa> findAllByOrderByIdAsc(); }
}
