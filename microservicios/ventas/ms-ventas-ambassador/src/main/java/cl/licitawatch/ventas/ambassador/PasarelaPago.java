package cl.licitawatch.ventas.ambassador;

/** Contrato de la pasarela de pagos externa (Transbank). Solo ms-ventas-ambassador lo implementa: la BS de Ventas nunca habla directo con el proveedor. */
public interface PasarelaPago {
    record Resultado(boolean aprobado, String idTransaccion, String detalle) {}
    Resultado cobrar(int monto, String metodo, String ordenCompra, boolean simularRechazo);
}
