package cl.licitawatch.ventas;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;

/** ms-ventas-bs (puerto 8183). Capa BS: reglas de negocio. Llama a su capa BD y a la capa BS de otros dominios. */
@SpringBootApplication(scanBasePackages = "cl.licitawatch")
public class VentasBsApplication {
    public static void main(String[] args) { SpringApplication.run(VentasBsApplication.class, args); }
}
