package cl.licitawatch.ventas;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;

/** ms-ventas-bff (puerto 8083). Capa BFF: recibe las peticiones del front (vía API Gateway), valida el JWT y el rol, y llama a la capa BS. */
@SpringBootApplication(scanBasePackages = "cl.licitawatch")
public class VentasBffApplication {
    public static void main(String[] args) { SpringApplication.run(VentasBffApplication.class, args); }
}
