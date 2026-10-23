package cl.licitawatch.common;

import io.jsonwebtoken.Claims;
import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;

import java.io.IOException;
import java.util.List;

/**
 * Seguridad de cada capa. En el BFF valida el Bearer JWT y deja la Sesion en la petición (rutas públicas en lw.publicas).
 * Las rutas entre capas y servicios (/bs/**, /bd/**, /ambassador/** e /internal/**) exigen la cabecera X-Internal-Key; si la llamada viene
 * de un BFF trae además X-Usuario-Id y X-Usuario-Rol, con lo que la capa BS conoce la sesión sin volver a validar el JWT.
 */
@Component
public class JwtAuthFilter extends OncePerRequestFilter {
    public static final String ATTR = "lw.sesion";
    private final JwtService jwt;
    private final List<String> publicas;
    private final String internalKey;

    public JwtAuthFilter(JwtService jwt, @Value("${lw.publicas:}") List<String> publicas, @Value("${lw.internal-key}") String internalKey) {
        this.jwt = jwt; this.publicas = publicas; this.internalKey = internalKey;
    }

    @Override
    protected void doFilterInternal(HttpServletRequest req, HttpServletResponse res, FilterChain chain) throws ServletException, IOException {
        String path = req.getRequestURI();
        if (req.getMethod().equals("OPTIONS") || path.startsWith("/actuator") || path.startsWith("/h2-console")) { chain.doFilter(req, res); return; }
        if (path.startsWith("/internal/") || path.startsWith("/bs/") || path.startsWith("/bd/") || path.startsWith("/ambassador/")) {
            if (!internalKey.equals(req.getHeader(InternalClient.H_KEY))) { error(res, 403, "Acceso interno denegado"); return; }
            String id = req.getHeader(InternalClient.H_USUARIO), rol = req.getHeader(InternalClient.H_ROL);
            if (id != null && rol != null) req.setAttribute(ATTR, new Sesion(Long.parseLong(id), rol));
            chain.doFilter(req, res);
            return;
        }
        String h = req.getHeader("Authorization");
        if (h != null && h.startsWith("Bearer ")) {
            try {
                Claims c = jwt.validar(h.substring(7));
                String rol = c.get("rol", String.class);
                // Los tokens de los enlaces del correo (recuperar contraseña y verificar cuenta) no son sesiones.
                if ("RESET".equals(rol) || "VERIFICAR".equals(rol)) throw new IllegalStateException("token de un solo propósito no es sesión");
                req.setAttribute(ATTR, new Sesion(Long.parseLong(c.getSubject()), c.get("rol", String.class)));
            } catch (Exception e) {
                if (!esPublica(path)) { error(res, 401, "Sesión expirada o inválida"); return; }
            }
        }
        if (req.getAttribute(ATTR) == null && !esPublica(path)) { error(res, 401, "Debes iniciar sesión"); return; }
        chain.doFilter(req, res);
    }

    private boolean esPublica(String path) { return publicas.stream().anyMatch(p -> !p.isBlank() && path.startsWith(p.trim())); }

    private void error(HttpServletResponse res, int code, String msg) throws IOException {
        res.setStatus(code); res.setContentType("application/json;charset=UTF-8");
        res.getWriter().write("{\"mensaje\":\"" + msg + "\"}");
    }
}
