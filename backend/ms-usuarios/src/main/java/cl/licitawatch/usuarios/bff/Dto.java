package cl.licitawatch.usuarios.bff;

import jakarta.validation.constraints.*;
import java.time.Instant;

/** Contratos JSON expuestos al front (coinciden con src/api/types.ts). */
public final class Dto {
    private Dto() {}
    public record Login(@NotBlank String email, @NotBlank String password) {}
    public record Recuperar(@NotBlank String email) {}
    public record Restablecer(@NotBlank String token, @NotBlank String password) {}
    public record Estado(boolean activo) {}

    public record Registro(
            @NotBlank @Email String email, @NotBlank String password, @NotBlank String razonSocial,
            @NotBlank String rutEmpresa, @NotBlank String rutPersona, @NotBlank String nombreContacto,
            @NotBlank @Email String emailContacto, String telefono, @NotNull Integer rubroId, @NotNull Integer ciudadId,
            Integer tamanoEmpresaId, String descripcionEmpresa, String sitioWeb, String giro, boolean siiValidado) {}

    public record PerfilEdicion(String razonSocial, String giro, Integer rubroId, Integer tamanoEmpresaId, Integer ciudadId, String nombreContacto,
                                String emailContacto, String telefono, String sitioWeb, String descripcionEmpresa) {}

    public record UsuarioDto(Long id, String email, String rol, boolean activo, Instant createdAt, Instant ultimoLogin, String foto) {}
    public record Foto(@NotBlank String foto) {}
    public record PerfilDto(Long usuarioId, String razonSocial, String rutEmpresa, String rutPersona, String nombreContacto, String emailContacto,
                            String telefono, Integer rubroId, Integer ciudadId, Integer tamanoEmpresaId, String descripcionEmpresa, String sitioWeb,
                            String giro, boolean siiValidado, Instant updatedAt) {}
    public record SesionDto(String token, UsuarioDto usuario, PerfilDto perfil) {}
    public record Disponible(boolean disponible) {}
    public record CatalogoDto(Integer id, String nombre) {}
    public record CiudadDto(Integer id, String nombre, Integer regionId) {}
    public record UsuarioAdmin(UsuarioDto usuario, String nombre, String rutEmpresa, String plan) {}
}
