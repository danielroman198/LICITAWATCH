package cl.licitawatch.licitaciones.bs;

import jakarta.validation.constraints.*;
import java.time.Instant;
import java.util.List;

public final class Dto {
    private Dto() {}
    public record DocumentoDto(@NotBlank String nombre, String tipo, int tamanoKb) {}
    public record NuevaLicitacion(@NotBlank @Size(max = 160) String titulo, @NotBlank String descripcion, @NotNull Integer rubroId, @NotNull Integer regionId,
                                  Long presupuestoMin, Long presupuestoMax, Integer maxPostulantes, String imagenUrl, List<DocumentoDto> documentos, @NotNull Instant fechaCierre) {}
    public record LicitacionDto(Long id, Long licitadorId, String licitadorNombre, String titulo, String descripcion, Integer rubroId, Integer regionId, Long presupuestoMin,
                                Long presupuestoMax, Integer maxPostulantes, String imagenUrl, List<DocumentoDto> documentos, Instant fechaCierre, String estado,
                                Instant createdAt, long postulantes, Long pymeAdjudicadaId) {}
    public record Postular(String mensaje) {}
    public record Decision(@NotBlank String estado) {}
    public record PostulacionDto(Long id, Long licitacionId, String licitacionTitulo, String licitadorNombre, Long pymeId, String pymeNombre, Integer pymeRubroId,
                                 Integer pymeTamanoId, boolean premium, String mensaje, Instant fecha, String estado, boolean adjudicada, Instant updatedAt, Long conversacionId) {}
    public record PuntoMensual(String mes, long valor) {}
    public record ResumenLicitador(long publicadas, long abiertas, long adjudicadas, long postulacionesRecibidas, long pendientes, List<PuntoMensual> porMes, List<LicitacionDto> recientes) {}
    public record ResumenPyme(long postulacionesTotal, long pendientes, long aprobadas, long rechazadas, long adjudicadas, long usadasMes, long limiteMes, String plan,
                              List<PuntoMensual> porMes, List<LicitacionDto> recomendadas) {}
}
