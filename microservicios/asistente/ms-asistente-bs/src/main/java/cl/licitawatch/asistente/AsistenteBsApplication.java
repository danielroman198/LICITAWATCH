package cl.licitawatch.asistente;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;

/** ms-asistente-bs (puerto 8186). Capa BS: reglas de negocio. Llama a su capa BD y a la capa BS de otros dominios. */
@SpringBootApplication(scanBasePackages = "cl.licitawatch")
public class AsistenteBsApplication {
    public static void main(String[] args) { SpringApplication.run(AsistenteBsApplication.class, args); }
}
