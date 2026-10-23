package cl.licitawatch.usuarios.bs;

import cl.licitawatch.common.ApiException;
import cl.licitawatch.usuarios.ambassador.SiiAmbassador;
import cl.licitawatch.usuarios.bs.Dto.*;
import cl.licitawatch.usuarios.bs.UsuariosBd.PerfilFila;
import cl.licitawatch.usuarios.bs.UsuariosBd.UsuarioFila;
import org.springframework.stereotype.Service;

@Service
public class RegistroService {
    private final UsuariosBd bd; private final AuthService auth; private final SiiAmbassador sii;

    public RegistroService(UsuariosBd bd, AuthService auth, SiiAmbassador sii) { this.bd = bd; this.auth = auth; this.sii = sii; }

    public boolean emailDisponible(String email) { return !bd.emailExiste(email); }
    public boolean rutDisponible(String rut) { return !bd.rutExiste(Rut.limpiar(rut)); }
    public boolean rutPersonaDisponible(String rut) { return !bd.rutPersonaExiste(Rut.limpiar(rut)); }

    /**
     * Valida los datos y pide a la capa BD el INSERT en usuario y en licitador o pyme (una transacción allá: si falla cualquiera, rollback).
     * La cuenta queda sin verificar: no se inicia sesión y, ya guardada, se envía el enlace de verificación al correo de acceso. 201 / 400 / 409.
     */
    public RegistroOk registrar(String rol, Registro d) {
        String msg = AuthService.validarPassword(d.password());
        if (msg != null) throw ApiException.invalido(msg);
        String rut = Rut.limpiar(d.rutEmpresa());
        if (!Rut.valido(rut) || !Rut.esEmpresa(rut)) throw ApiException.invalido("El RUT de la empresa no es válido");
        String rutPersona = Rut.limpiar(d.rutPersona());
        if (!Rut.valido(rutPersona) || !Rut.esPersona(rutPersona)) throw ApiException.invalido("El RUT personal no es válido");
        boolean pyme = "PYME".equals(rol);
        if (pyme && !bd.tamanoExiste(d.tamanoEmpresaId())) throw ApiException.invalido("Indica el tamaño de la empresa");
        if (!bd.rubroExiste(d.rubroId())) throw ApiException.invalido("El rubro no existe");
        if (!bd.ciudadExiste(d.ciudadId())) throw ApiException.invalido("La ciudad no existe");
        if (bd.emailExiste(d.email())) throw ApiException.conflicto("Ya existe una cuenta con ese correo");
        if (bd.rutExiste(rut)) throw ApiException.conflicto("Ya existe una cuenta registrada con ese RUT");
        if (bd.rutPersonaExiste(rutPersona)) throw ApiException.conflicto("Ese RUT personal ya está registrado");
        // No confiamos en el flag del cliente: se vuelve a consultar al SII. Si el SII no responde, se registra igual.
        try { sii.consultar(rut); } catch (ApiException e) { /* pasa sin verificar */ }

        PerfilFila perfil = new PerfilFila(null, rol, d.razonSocial().trim(), rut, rutPersona, d.nombreContacto().trim(), d.emailContacto().trim(), d.telefono() == null ? "" : d.telefono(),
                d.rubroId(), d.ciudadId(), pyme ? d.tamanoEmpresaId() : null, d.descripcionEmpresa() == null ? "" : d.descripcionEmpresa(), d.sitioWeb(), null, null, null);
        UsuarioFila u = bd.crear(d.email().trim().toLowerCase(), auth.hash(d.password()), rol, false, perfil);

        // Ya guardado (la capa BD hizo COMMIT): Notificaciones puede consultar el correo del usuario.
        auth.enviarVerificacion(u);
        return new RegistroOk(u.email(), "Te enviamos un correo para verificar tu cuenta");
    }

    public PerfilDto actualizarPerfil(long usuarioId, PerfilEdicion d) {
        // El correo de acceso y el RUT no se editan (ER). El giro no existe en el modelo y se ignora. Los catálogos inexistentes se ignoran.
        PerfilFila cambios = new PerfilFila(null, null, noVacio(d.razonSocial()), null, null, noVacio(d.nombreContacto()), noVacio(d.emailContacto()), d.telefono(),
                d.rubroId() != null && bd.rubroExiste(d.rubroId()) ? d.rubroId() : null, d.ciudadId() != null && bd.ciudadExiste(d.ciudadId()) ? d.ciudadId() : null,
                d.tamanoEmpresaId() != null && bd.tamanoExiste(d.tamanoEmpresaId()) ? d.tamanoEmpresaId() : null, d.descripcionEmpresa(), d.sitioWeb(), null, null, null);
        return Mapeo.perfil(bd.actualizarPerfil(usuarioId, cambios));
    }

    private static String noVacio(String s) { return s == null || s.isBlank() ? null : s.trim(); }
}
