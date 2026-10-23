package cl.licitawatch.ventas.ambassador;

import cl.licitawatch.common.ApiException;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.*;

/**
 * Ambassador de Ventas: la capa BS de Ventas le pide los cobros y este componente habla con la pasarela externa
 * (Transbank Webpay Plus o el simulador, según lw.pasarela.modo). Así la BS nunca conoce las credenciales ni el protocolo del proveedor.
 * Solo acepta llamadas internas (cabecera X-Internal-Key).
 */
@RestController
@RequestMapping("/ambassador/pagos")
public class PasarelaController {
    public record Cobro(int monto, String metodo, String ordenCompra, boolean simularRechazo) {}
    private final PasarelaPago pasarela;
    public PasarelaController(PasarelaPago pasarela) { this.pasarela = pasarela; }

    @PostMapping
    public PasarelaPago.Resultado cobrar(@RequestBody Cobro c) {
        if (c.monto() <= 0) throw ApiException.invalido("El monto a cobrar debe ser mayor a cero");
        try { return pasarela.cobrar(c.monto(), c.metodo(), c.ordenCompra(), c.simularRechazo()); }
        catch (ApiException e) { throw e; }
        catch (Exception e) { throw new ApiException(HttpStatus.BAD_GATEWAY, "La pasarela de pago no respondió. Intenta nuevamente."); }
    }

    /** Webpay Plus: confirma la transacción cuando el usuario vuelve con token_ws (solo en modo transbank). */
    @PostMapping("/{tokenWs}/confirmar")
    public PasarelaPago.Resultado confirmar(@PathVariable String tokenWs) {
        if (!(pasarela instanceof TransbankWebpay tbk)) throw ApiException.invalido("La confirmación solo aplica con PASARELA_MODO=transbank");
        try { return tbk.confirmar(tokenWs); }
        catch (Exception e) { throw new ApiException(HttpStatus.BAD_GATEWAY, "La pasarela de pago no respondió. Intenta nuevamente."); }
    }
}
