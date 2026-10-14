package cl.licitawatch.common;

import jakarta.servlet.http.HttpServletRequest;

/** Utilidad para controladores: obtiene la sesión y exige roles. */
public final class Auth {
    private Auth() {}

    public static Sesion sesion(HttpServletRequest req) {
        Object s = req.getAttribute(JwtAuthFilter.ATTR);
        if (s == null) throw ApiException.noAutorizado("Debes iniciar sesión");
        return (Sesion) s;
    }

    public static Sesion exigir(HttpServletRequest req, String... roles) {
        Sesion s = sesion(req);
        for (String r : roles) if (r.equals(s.rol())) return s;
        throw ApiException.prohibido("No tienes permiso para esta acción");
    }
}
