package cl.licitawatch.licitaciones;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;

/** ms-licitaciones-bff (puerto 8082). Capa BFF: recibe las peticiones del front (vía API Gateway), valida el JWT y el rol, y llama a la capa BS. */
@SpringBootApplication(scanBasePackages = "cl.licitawatch")
public class LicitacionesBffApplication {
    public static void main(String[] args) { SpringApplication.run(LicitacionesBffApplication.class, args); }
}
