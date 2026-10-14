package cl.licitawatch.licitaciones.bd;

import cl.licitawatch.licitaciones.bd.Catalogos.*;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;
import java.util.Optional;

public final class Repos {
    private Repos() {}

    public interface EstadoLicitacionRepo extends JpaRepository<EstadoLicitacion, Integer> { Optional<EstadoLicitacion> findByNombre(String n); }
    public interface EstadoPostulacionRepo extends JpaRepository<EstadoPostulacion, Integer> { Optional<EstadoPostulacion> findByNombre(String n); }
    public interface TipoArchivoRepo extends JpaRepository<TipoArchivo, Integer> { Optional<TipoArchivo> findByNombre(String n); }

    public interface LicitacionRepo extends JpaRepository<Licitacion, Long> {
        List<Licitacion> findByLicitadorIdOrderByCreatedAtDesc(Long licitadorId);
        List<Licitacion> findAllByOrderByCreatedAtDesc();
        void deleteByLicitadorId(Long licitadorId);

        @Query("""
            select l from Licitacion l where (:rubro is null or l.rubroId = :rubro)
              and (:region is null or l.regionId = :region) and (:maxP is null or l.presupuestoMin is null or l.presupuestoMin <= :maxP)
              and (:q = '' or lower(l.titulo) like lower(concat('%', :q, '%')) or lower(l.descripcion) like lower(concat('%', :q, '%')))
            order by l.createdAt desc""")
        List<Licitacion> buscar(@Param("q") String q, @Param("rubro") Integer rubro, @Param("region") Integer region, @Param("maxP") BigDecimal maxP);
    }

    public interface PostulacionRepo extends JpaRepository<Postulacion, Long> {
        List<Postulacion> findByLicitacionId(Long licitacionId);
        List<Postulacion> findByPymeIdOrderByFechaPostulacionDesc(Long pymeId);
        Optional<Postulacion> findByLicitacionIdAndPymeId(Long licitacionId, Long pymeId);
        long countByLicitacionId(Long licitacionId);
        long countByPymeIdAndFechaPostulacionGreaterThanEqual(Long pymeId, LocalDate desde);
        void deleteByPymeId(Long pymeId);
        void deleteByLicitacionId(Long licitacionId);
    }
}
