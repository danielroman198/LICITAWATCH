package cl.licitawatch.usuarios.bs;

/** Utilidades de RUT chileno (módulo 11). Idéntico criterio al del front (src/lib/rut.ts). */
public final class Rut {
    private Rut() {}

    public static String limpiar(String rut) { return rut == null ? "" : rut.replaceAll("[^0-9kK]", "").toUpperCase(); }

    public static String dv(String cuerpo) {
        int suma = 0, mul = 2;
        for (int i = cuerpo.length() - 1; i >= 0; i--) { suma += (cuerpo.charAt(i) - '0') * mul; mul = mul == 7 ? 2 : mul + 1; }
        int r = 11 - (suma % 11);
        return r == 11 ? "0" : r == 10 ? "K" : String.valueOf(r);
    }

    public static boolean valido(String rut) {
        String l = limpiar(rut);
        if (l.length() < 8 || l.length() > 9) return false;
        String cuerpo = l.substring(0, l.length() - 1);
        return cuerpo.chars().allMatch(Character::isDigit) && dv(cuerpo).equals(l.substring(l.length() - 1));
    }

    public static boolean esEmpresa(String rut) { String l = limpiar(rut); return l.length() > 1 && Long.parseLong(l.substring(0, l.length() - 1)) >= 50_000_000L; }

    public static boolean esPersona(String rut) { String l = limpiar(rut); return l.length() > 1 && Long.parseLong(l.substring(0, l.length() - 1)) < 50_000_000L; }

    public static String formatear(String rut) {
        String l = limpiar(rut);
        if (l.length() < 2) return l;
        String c = l.substring(0, l.length() - 1);
        return c.replaceAll("\\B(?=(\\d{3})+(?!\\d))", ".") + "-" + l.charAt(l.length() - 1);
    }
}
