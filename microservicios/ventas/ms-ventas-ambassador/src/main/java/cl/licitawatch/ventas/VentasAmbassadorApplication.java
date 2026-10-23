package cl.licitawatch.ventas;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;

/** ms-ventas-ambassador (puerto 8383). Patrón Ambassador: aísla a Ventas de la pasarela de pago externa (Transbank Webpay Plus). */
@SpringBootApplication(scanBasePackages = "cl.licitawatch")
public class VentasAmbassadorApplication {
    public static void main(String[] args) { SpringApplication.run(VentasAmbassadorApplication.class, args); }
}
