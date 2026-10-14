package cl.licitawatch.ventas.ambassador;

import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.stereotype.Component;

import java.util.UUID;

/** Simula Webpay: aprueba siempre salvo que se pida rechazo (para demostrar el flujo de error). */
@Component
@ConditionalOnProperty(name = "lw.pasarela.modo", havingValue = "simulado", matchIfMissing = true)
public class PasarelaSimulada implements PasarelaPago {
    @Override
    public Resultado cobrar(int monto, String metodo, String ordenCompra, boolean simularRechazo) {
        String id = "WP-" + UUID.randomUUID().toString().substring(0, 8).toUpperCase();
        return simularRechazo ? new Resultado(false, id, "Rechazado por el emisor") : new Resultado(true, id, "Autorizado");
    }
}
