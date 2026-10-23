package cl.licitawatch.ventas.bs;

import cl.licitawatch.common.InternalClient;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

import java.util.Map;

/** La capa BS no habla con Transbank: le pide el cobro a ms-ventas-ambassador por REST. */
@Component
public class PasarelaCliente {
    public record Resultado(boolean aprobado, String idTransaccion, String detalle) {}
    private final InternalClient interno; private final String url;
    public PasarelaCliente(InternalClient interno, @Value("${lw.urls.ambassador}") String url) { this.interno = interno; this.url = url; }

    public Resultado cobrar(int monto, String metodo, String ordenCompra, boolean simularRechazo) {
        return interno.post(url + "/ambassador/pagos", Map.of("monto", monto, "metodo", metodo, "ordenCompra", ordenCompra, "simularRechazo", simularRechazo), Resultado.class);
    }
}
