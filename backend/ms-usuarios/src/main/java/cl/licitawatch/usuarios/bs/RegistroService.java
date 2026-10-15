package cl.licitawatch.usuarios.bs;

import cl.licitawatch.common.ApiException;
import cl.licitawatch.common.InternalClient;
import cl.licitawatch.common.JwtService;
import cl.licitawatch.usuarios.ambassador.SiiAmbassador;
import cl.licitawatch.usuarios.bd.*;
import cl.licitawatch.usuarios.bd.Repos.*;
import cl.licitawatch.usuarios.bff.Dto.*;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;

@Service
public class RegistroService {
    private final UsuarioRepo usuarios; private final RolRepo roles; private final LicitadorRepo licitadores; private final PymeRepo pymes;
    private final RubroRepo rubros; private final CiudadRepo ciudades; private final TamanoRepo tamanos;
    private final PerfilService perfiles; private final AuthService auth; private final SiiAmbassador sii;
    private final JwtService jwt; private final InternalClient interno; private final String urlNotif;

    public RegistroService(UsuarioRepo usuarios, RolRepo roles, LicitadorRepo licitadores, PymeRepo pymes, RubroRepo rubros, CiudadRepo ciudades, TamanoRepo tamanos,
                           PerfilService perfiles, AuthService auth, SiiAmbassador sii, JwtService jwt, InternalClient interno,
                           @Value("${lw.urls.notificaciones}") String urlNotif) {
        this.usuarios = usuarios; this.roles = roles; this.licitadores = licitadores; this.pymes = pymes; this.rubros = rubros; this.ciudades = ciudades; this.tamanos = tamanos;
        this.perfiles = perfiles; this.auth = auth; this.sii = sii; this.jwt = jwt; this.interno = interno; this.urlNotif = urlNotif;
    }

    public boolean emailDisponible(String email) { return !usuarios.existsByEmailIgnoreCase(email.trim()); }
    public boolean rutDisponible(String rut) { return !perfiles.rutExiste(Rut.limpiar(rut)); }
    public boolean rutPersonaDisponible(String rut) { return !perfiles.rutPersonaExiste(Rut.limpiar(rut)); }

    /**
     * Flujo POST del ER: una transacción con INSERT en usuario y luego en licitador o pyme.
     * Si falla cualquier INSERT se hace rollback completo. 201 / 400 / 409.
     */
    @Transactional
    public SesionDto registrar(String rol, Registro d) {
        String msg = AuthService.validarPassword(d.password());
        if (msg != null) throw ApiException.invalido(msg);
        String rut = Rut.limpiar(d.rutEmpresa());
        if (!Rut.valido(rut) || !Rut.esEmpresa(rut)) throw ApiException.invalido("El RUT de la empresa no es válido");
        String rutPersona = Rut.limpiar(d.rutPersona());
        if (!Rut.valido(rutPersona) || !Rut.esPersona(rutPersona)) throw ApiException.invalido("El RUT personal no es válido");
        boolean pyme = "PYME".equals(rol);
        if (pyme && (d.tamanoEmpresaId() == null || !tamanos.existsById(d.tamanoEmpresaId()))) throw ApiException.invalido("Indica el tamaño de la empresa");
        if (!rubros.existsById(d.rubroId())) throw ApiException.invalido("El rubro no existe");
        if (!ciudades.existsById(d.ciudadId())) throw ApiException.invalido("La ciudad no existe");
        if (usuarios.existsByEmailIgnoreCase(d.email().trim())) throw ApiException.conflicto("Ya existe una cuenta con ese correo");
        if (perfiles.rutExiste(rut)) throw ApiException.conflicto("Ya existe una cuenta registrada con ese RUT");
        if (perfiles.rutPersonaExiste(rutPersona)) throw ApiException.conflicto("Ese RUT personal ya está registrado");
        // No confiamos en el flag del cliente: se vuelve a consultar al SII. Si el SII no responde, se registra igual.
        try { sii.consultar(rut); } catch (ApiException e) { /* pasa sin verificar */ }

        Usuario u = new Usuario();
        u.setEmail(d.email().trim().toLowerCase()); u.setPassword(auth.hash(d.password()));
        u.setRol(roles.findByNombre(rol).orElseThrow(() -> ApiException.invalido("Rol inexistente")));
        u = usuarios.save(u);

        PerfilBase p = pyme ? new Pyme() : new Licitador();
        p.setUsuarioId(u.getId()); p.setRazonSocial(d.razonSocial().trim()); p.setRut(rut); p.setRutPersona(rutPersona);
        p.setNombreContacto(d.nombreContacto().trim()); p.setEmailContacto(d.emailContacto().trim()); p.setTelefono(d.telefono() == null ? "" : d.telefono());
        p.setRubroId(d.rubroId()); p.setCiudadId(d.ciudadId());
        p.setDescripcionEmpresa(d.descripcionEmpresa() == null ? "" : d.descripcionEmpresa()); p.setSitioWeb(d.sitioWeb());
        if (pyme) { ((Pyme) p).setTamanoEmpresaId(d.tamanoEmpresaId()); pymes.save((Pyme) p); } else licitadores.save((Licitador) p);

        interno.notificar(urlNotif, u.getId(), "CORREO", "¡Bienvenido a LicitaWatch!",
                "Tu cuenta de " + (pyme ? "Pyme" : "Licitador") + " fue creada. Ya puedes ingresar a tu panel.", true);
        return auth.sesion(u, jwt.emitir(u.getId(), rol));
    }

    @Transactional
    public PerfilDto actualizarPerfil(long usuarioId, PerfilEdicion d) {
        Usuario u = usuarios.findById(usuarioId).orElseThrow(() -> ApiException.noEncontrado("Usuario no encontrado"));
        PerfilBase p = perfiles.empresa(u).orElseThrow(() -> ApiException.noEncontrado("Perfil no encontrado"));
        // El correo de acceso y el RUT no se editan (ER). El giro no existe en el modelo y se ignora.
        if (d.razonSocial() != null && !d.razonSocial().isBlank()) p.setRazonSocial(d.razonSocial().trim());
        if (d.nombreContacto() != null && !d.nombreContacto().isBlank()) p.setNombreContacto(d.nombreContacto().trim());
        if (d.emailContacto() != null && !d.emailContacto().isBlank()) p.setEmailContacto(d.emailContacto().trim());
        if (d.telefono() != null) p.setTelefono(d.telefono());
        if (d.rubroId() != null && rubros.existsById(d.rubroId())) p.setRubroId(d.rubroId());
        if (d.ciudadId() != null && ciudades.existsById(d.ciudadId())) p.setCiudadId(d.ciudadId());
        if (d.tamanoEmpresaId() != null && p instanceof Pyme py && tamanos.existsById(d.tamanoEmpresaId())) py.setTamanoEmpresaId(d.tamanoEmpresaId());
        if (d.sitioWeb() != null) p.setSitioWeb(d.sitioWeb());
        if (d.descripcionEmpresa() != null) p.setDescripcionEmpresa(d.descripcionEmpresa());
        p.setUpdatedAt(Instant.now());
        return Mapeo.perfil(p);
    }
}
