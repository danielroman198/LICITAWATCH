package cl.licitawatch.notificaciones;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;

/** ms-notificaciones-bs (puerto 8184). Capa BS: reglas de negocio. Llama a su capa BD y a la capa BS de otros dominios. */
@SpringBootApplication(scanBasePackages = "cl.licitawatch")
public class NotificacionesBsApplication {
    public static void main(String[] args) { SpringApplication.run(NotificacionesBsApplication.class, args); }
}
