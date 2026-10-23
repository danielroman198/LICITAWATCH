package cl.licitawatch.licitaciones;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;

/** ms-licitaciones-bs (puerto 8182). Capa BS: reglas de negocio. Llama a su capa BD y a la capa BS de otros dominios. */
@SpringBootApplication(scanBasePackages = "cl.licitawatch")
public class LicitacionesBsApplication {
    public static void main(String[] args) { SpringApplication.run(LicitacionesBsApplication.class, args); }
}
