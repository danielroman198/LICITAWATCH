package cl.licitawatch.usuarios.bff;

import jakarta.validation.constraints.*;

/** Datos de entrada que el BFF valida antes de pasarlos a la capa BS (las respuestas vienen armadas desde la BS). */
public final class Dto {
    private Dto() {}
    public record Login(@NotBlank String email, @NotBlank String password) {}
    public record Recuperar(@NotBlank String email) {}
    public record Restablecer(@NotBlank String token, @NotBlank String password) {}
    public record Verificar(@NotBlank String token) {}
    public record Estado(boolean activo) {}
    public record Foto(@NotBlank String foto) {}

    public record Registro(
            @NotBlank @Email String email, @NotBlank String password, @NotBlank String razonSocial,
            @NotBlank String rutEmpresa, @NotBlank String rutPersona, @NotBlank String nombreContacto,
            @NotBlank @Email String emailContacto, String telefono, @NotNull Integer rubroId, @NotNull Integer ciudadId,
            Integer tamanoEmpresaId, String descripcionEmpresa, String sitioWeb, String giro, boolean siiValidado) {}

    public record PerfilEdicion(String razonSocial, String giro, Integer rubroId, Integer tamanoEmpresaId, Integer ciudadId, String nombreContacto,
                                String emailContacto, String telefono, String sitioWeb, String descripcionEmpresa) {}
}
