package cl.licitawatch.ventas.ambassador;

/** Ambassador hacia la plataforma de pagos externa (Transbank). MS-Ventas nunca habla directo con el proveedor. */
public interface PasarelaPago {
    record Resultado(boolean aprobado, String idTransaccion, String detalle) {}
    Resultado cobrar(int monto, String metodo, String ordenCompra, boolean simularRechazo);
}
