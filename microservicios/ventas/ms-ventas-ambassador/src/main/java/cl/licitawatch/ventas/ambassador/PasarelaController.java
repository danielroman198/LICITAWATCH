package cl.licitawatch.ventas.ambassador;

import cl.licitawatch.common.ApiException;
import cl.licitawatch.ventas.ambassador.TransbankWebpay.*;
import org.springframework.web.bind.annotation.*;

/**
 * Ambassador de Ventas: la capa BS de Ventas le pide los cobros y este componente es el único que habla con la pasarela externa
 * (Transbank Webpay Plus). Así la BS nunca conoce las credenciales ni el protocolo del proveedor.
 * Solo acepta llamadas internas (cabecera X-Internal-Key).
 */
@RestController
@RequestMapping("/ambassador/webpay/transacciones")
public class PasarelaController {
    public record Cobro(long monto, String ordenCompra, String sesionId) {}
    private final TransbankWebpay webpay;
    public PasarelaController(TransbankWebpay webpay) { this.webpay = webpay; }

    @PostMapping
    public Transaccion crear(@RequestBody Cobro c) {
        if (c.monto() <= 0) throw ApiException.invalido("El monto a cobrar debe ser mayor a cero");
        if (c.ordenCompra() == null || c.ordenCompra().isBlank() || c.ordenCompra().length() > 26) throw ApiException.invalido("Orden de compra inválida (máx. 26 caracteres)");
        if (c.sesionId() == null || c.sesionId().isBlank() || c.sesionId().length() > 61) throw ApiException.invalido("Id de sesión inválido (máx. 61 caracteres)");
        return webpay.crear(c.monto(), c.ordenCompra(), c.sesionId());
    }

    @PutMapping("/{token}") public Resultado confirmar(@PathVariable String token) { return webpay.confirmar(token); }
    @GetMapping("/{token}") public Resultado estado(@PathVariable String token) { return webpay.estado(token); }
}
