package cl.licitawatch.usuarios.bs;

import cl.licitawatch.common.ApiException;
import cl.licitawatch.common.InternalClient;
import cl.licitawatch.common.JwtService;
import cl.licitawatch.usuarios.bs.Dto.SesionDto;
import cl.licitawatch.usuarios.bs.Dto.UsuarioDto;
import cl.licitawatch.usuarios.bs.UsuariosBd.UsuarioFila;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.stereotype.Service;


@Service
public class AuthService {
    private final UsuariosBd bd;
    private final JwtService jwt; private final InternalClient interno;
    private final BCryptPasswordEncoder enc = new BCryptPasswordEncoder();
    private final String urlNotif, appUrl;

    public AuthService(UsuariosBd bd, JwtService jwt, InternalClient interno,
                       @Value("${lw.urls.notificaciones}") String urlNotif, @Value("${lw.app.url}") String appUrl) {
        this.bd = bd; this.jwt = jwt; this.interno = interno; this.urlNotif = urlNotif; this.appUrl = appUrl;
    }

    public static String validarPassword(String p) {
        if (p == null || p.length() < 8) return "La contraseña debe tener al menos 8 caracteres";
        if (!p.matches(".*[A-Z].*")) return "La contraseña debe incluir una mayúscula";
        if (!p.matches(".*[a-z].*")) return "La contraseña debe incluir una minúscula";
        if (!p.matches(".*\\d.*")) return "La contraseña debe incluir un número";
        return null;
    }

    public String hash(String password) { return enc.encode(password); }

    public SesionDto login(String email, String password) {
        UsuarioFila u = bd.porEmail(email).orElseThrow(() -> ApiException.noAutorizado("Correo o contraseña incorrectos"));
        if (!enc.matches(password, u.password())) throw ApiException.noAutorizado("Correo o contraseña incorrectos");
        if (!u.activo()) throw ApiException.prohibido("Tu cuenta está bloqueada. Contacta al administrador.");
        // 428: el front lo usa para ofrecer "Reenviar correo de verificación".
        if (!u.emailVerificado()) throw new ApiException(HttpStatus.PRECONDITION_REQUIRED, "Debes verificar tu correo antes de iniciar sesión. Revisa tu bandeja de entrada.");
        return sesion(u, jwt.emitir(u.id(), u.rol()));
    }

    /** Sesión actual; el token lo agrega el BFF (es el mismo que trajo la petición). */
    public SesionDto me(long usuarioId) {
        UsuarioFila u;
        try { u = bd.usuario(usuarioId); } catch (ApiException e) { throw ApiException.noAutorizado("Sesión inválida"); }
        if (!u.activo()) throw ApiException.prohibido("Tu cuenta está bloqueada");
        return sesion(u, null);
    }

    public SesionDto sesion(UsuarioFila u, String token) { return new SesionDto(token, Mapeo.usuario(u), bd.perfil(u.id()).map(Mapeo::perfil).orElse(null)); }

    /** Foto de perfil: el front la envía ya recortada a 256x256 en JPEG. null la quita (vuelven las iniciales). */
    public UsuarioDto actualizarFoto(long usuarioId, String foto) {
        if (foto != null) {
            if (!foto.matches("^data:image/(jpeg|png|webp);base64,[A-Za-z0-9+/=]+$")) throw ApiException.invalido("La imagen no tiene un formato válido (JPG, PNG o WEBP)");
            if (foto.length() > FOTO_MAX) throw ApiException.invalido("La imagen es demasiado grande");
        }
        return Mapeo.usuario(bd.foto(usuarioId, foto));
    }
    private static final int FOTO_MAX = 400_000;   // ~300 KB en base64; una foto de 256x256 pesa ~20-40 KB

    /** Responde siempre igual exista o no el correo (no revela qué cuentas existen). El enlace lleva un token firmado (1 h); no hay tabla de tokens en el ER. */
    public void solicitarRecuperacion(String email) {
        bd.porEmail(email).filter(UsuarioFila::activo).ifPresent(u -> {
            String enlace = appUrl + "/restablecer?token=" + jwt.emitirReset(u.id());
            interno.notificar(urlNotif, u.id(), "CORREO", "Recupera tu contraseña de LicitaWatch",
                    "Recibimos una solicitud para restablecer tu contraseña. Usa este enlace (vence en 1 hora): " + enlace, true);
        });
    }

    public void restablecer(String token, String password) {
        String err = validarPassword(password);
        if (err != null) throw ApiException.invalido(err);
        Long id = jwt.validarReset(token);
        if (id == null) throw ApiException.invalido("El enlace de recuperación no es válido o ya venció");
        try { bd.cambiar(id, null, true, enc.encode(password)); }   // abrir el enlace del correo ya prueba que el correo es suyo: queda verificada
        catch (ApiException e) { throw ApiException.invalido("El enlace de recuperación no es válido"); }
    }

    /** Envía el enlace de verificación (vence en 24 h). Sin tabla de tokens: el enlace lleva un JWT de propósito VERIFICAR. */
    public void enviarVerificacion(UsuarioFila u) {
        String enlace = appUrl + "/verificar?token=" + jwt.emitirVerificacion(u.id());
        interno.notificar(urlNotif, u.id(), "CORREO", "Verifica tu cuenta de LicitaWatch",
                "¡Bienvenido a LicitaWatch! Para activar tu cuenta, confirma tu correo con este enlace (vence en 24 horas): " + enlace
                        + "\n\nSi no creaste esta cuenta, ignora este correo.", true);
    }

    /** Idempotente: si la cuenta ya estaba verificada, responde igual. */
    public void verificar(String token) {
        Long id = jwt.validarVerificacion(token);
        if (id == null) throw ApiException.invalido("El enlace de verificación no es válido o ya venció. Solicita uno nuevo.");
        try { bd.cambiar(id, null, true, null); } catch (ApiException e) { throw ApiException.invalido("El enlace de verificación no es válido"); }
    }

    /** Responde siempre igual (no revela qué cuentas existen). Solo reenvía si la cuenta existe, está activa y aún no se verifica. */
    public void reenviarVerificacion(String email) {
        bd.porEmail(email).filter(u -> u.activo() && !u.emailVerificado()).ifPresent(this::enviarVerificacion);
    }
}
