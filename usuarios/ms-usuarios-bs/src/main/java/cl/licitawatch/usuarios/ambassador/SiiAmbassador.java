package cl.licitawatch.usuarios.ambassador;

/** Ambassador hacia el SII: aísla el servicio externo del resto del microservicio (patrón Ambassador). */
public interface SiiAmbassador {
    record ConsultaSii(String rut, String razonSocial, String giro, String estado, String inicioActividades, boolean modoPruebas) {}

    /** @throws cl.licitawatch.common.ApiException 404 si no existe/no es empresa, 503 si el SII no responde. */
    ConsultaSii consultar(String rutLimpio);
}
