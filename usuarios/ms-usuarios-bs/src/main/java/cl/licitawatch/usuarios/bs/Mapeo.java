package cl.licitawatch.usuarios.bs;

import cl.licitawatch.usuarios.bs.Dto.*;
import cl.licitawatch.usuarios.bs.UsuariosBd.PerfilFila;
import cl.licitawatch.usuarios.bs.UsuariosBd.UsuarioFila;

/**
 * Traduce las filas del ER al contrato JSON del front.
 * Campos que el ER no tiene (giro, ultimoLogin) se devuelven vacíos; siiValidado es true
 * para licitador/pyme porque el registro exige consultar el RUT en el SII.
 */
public final class Mapeo {
    private Mapeo() {}
    public static UsuarioDto usuario(UsuarioFila u) { return new UsuarioDto(u.id(), u.email(), u.rol(), u.activo(), u.emailVerificado(), u.createdAt(), null, u.foto()); }

    public static PerfilDto perfil(PerfilFila p) {
        if (!p.esEmpresa()) return new PerfilDto(p.usuarioId(), "LicitaWatch", "", "", p.nombre(), "", null, null, null, null, null, null, null, false, null);
        return new PerfilDto(p.usuarioId(), p.razonSocial(), Rut.formatear(p.rut()), p.rutPersona() == null ? "" : Rut.formatear(p.rutPersona()), p.nombreContacto(), p.emailContacto(), p.telefono(),
                p.rubroId(), p.ciudadId(), p.tamanoEmpresaId(), p.descripcionEmpresa(), p.sitioWeb(), null, true, p.updatedAt());
    }
}
