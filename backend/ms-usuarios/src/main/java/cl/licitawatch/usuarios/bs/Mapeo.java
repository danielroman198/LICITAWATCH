package cl.licitawatch.usuarios.bs;

import cl.licitawatch.usuarios.bd.*;
import cl.licitawatch.usuarios.bff.Dto.*;

/**
 * Traduce las entidades del ER al contrato JSON del front.
 * Campos que el ER no tiene (giro, ultimoLogin) se devuelven vacíos; siiValidado es true
 * para licitador/pyme porque el registro exige consultar el RUT en el SII.
 */
public final class Mapeo {
    private Mapeo() {}
    public static UsuarioDto usuario(Usuario u) { return new UsuarioDto(u.getId(), u.getEmail(), u.getRolNombre(), u.isActivo(), u.getCreatedAt(), null, u.getFoto()); }

    public static PerfilDto perfil(PerfilBase p) {
        return new PerfilDto(p.getUsuarioId(), p.getRazonSocial(), Rut.formatear(p.getRut()), p.getRutPersona() == null ? "" : Rut.formatear(p.getRutPersona()), p.getNombreContacto(), p.getEmailContacto(), p.getTelefono(),
                p.getRubroId(), p.getCiudadId(), p.getTamanoEmpresaId(), p.getDescripcionEmpresa(), p.getSitioWeb(), null, true, p.getUpdatedAt());
    }

    public static PerfilDto perfil(Administrador a) {
        return new PerfilDto(a.getUsuarioId(), "LicitaWatch", "", "", a.getNombre(), "", null, null, null, null, null, null, null, false, null);
    }
}
