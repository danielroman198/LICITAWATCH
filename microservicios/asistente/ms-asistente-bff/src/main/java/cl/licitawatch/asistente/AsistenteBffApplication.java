package cl.licitawatch.asistente;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;

/** ms-asistente-bff (puerto 8086). Capa BFF: recibe las peticiones del front (vía API Gateway), valida el JWT y el rol, y llama a la capa BS. */
@SpringBootApplication(scanBasePackages = "cl.licitawatch")
public class AsistenteBffApplication {
    public static void main(String[] args) { SpringApplication.run(AsistenteBffApplication.class, args); }
}
