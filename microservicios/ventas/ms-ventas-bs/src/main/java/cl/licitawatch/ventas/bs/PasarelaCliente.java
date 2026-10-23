package cl.licitawatch.ventas.bs;

import cl.licitawatch.common.InternalClient;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

import java.util.Map;

/** La capa BS no habla con Transbank: le pide crear y confirmar las transacciones Webpay a ms-ventas-ambassador por REST. */
@Component
public class PasarelaCliente {
    public record Transaccion(String token, String url) {}
    public record Resultado(boolean aprobado, String estado, int codigoRespuesta, String ordenCompra, String sesionId, long monto,
                            String codigoAutorizacion, String tipoPago, int cuotas, String ultimos4, String fechaTransaccion) {}
    private final InternalClient interno; private final String url;
    public PasarelaCliente(InternalClient interno, @Value("${lw.urls.ambassador}") String url) { this.interno = interno; this.url = url + "/ambassador/webpay/transacciones"; }

    public Transaccion crear(long monto, String ordenCompra, String sesionId) {
        return interno.post(url, Map.of("monto", monto, "ordenCompra", ordenCompra, "sesionId", sesionId), Transaccion.class);
    }
    public Resultado confirmar(String token) { return interno.put(url + "/" + InternalClient.q(token), null, Resultado.class); }
    public Resultado estado(String token) { return interno.get(url + "/" + InternalClient.q(token), Resultado.class); }
}
