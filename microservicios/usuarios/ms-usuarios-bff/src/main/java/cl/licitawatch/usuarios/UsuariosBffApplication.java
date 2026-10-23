package cl.licitawatch.usuarios;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;

/** ms-usuarios-bff (puerto 8081). Capa BFF: recibe las peticiones del front (vía API Gateway), valida el JWT y el rol, y llama a la capa BS. */
@SpringBootApplication(scanBasePackages = "cl.licitawatch")
public class UsuariosBffApplication {
    public static void main(String[] args) { SpringApplication.run(UsuariosBffApplication.class, args); }
}
