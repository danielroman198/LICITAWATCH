package cl.licitawatch.notificaciones;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;

/** ms-notificaciones-bff (puerto 8084). Capa BFF: recibe las peticiones del front (vía API Gateway), valida el JWT y el rol, y llama a la capa BS. */
@SpringBootApplication(scanBasePackages = "cl.licitawatch")
public class NotificacionesBffApplication {
    public static void main(String[] args) { SpringApplication.run(NotificacionesBffApplication.class, args); }
}
