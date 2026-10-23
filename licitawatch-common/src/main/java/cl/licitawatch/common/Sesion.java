package cl.licitawatch.common;

/** Usuario autenticado de la petición actual. */
public record Sesion(long usuarioId, String rol) {
    public boolean esAdmin() { return "ADMIN".equals(rol); }
    public boolean esLicitador() { return "LICITADOR".equals(rol); }
    public boolean esPyme() { return "PYME".equals(rol); }
}
