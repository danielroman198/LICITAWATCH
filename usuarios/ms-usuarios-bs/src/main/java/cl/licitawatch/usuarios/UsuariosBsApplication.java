package cl.licitawatch.usuarios;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;

/** ms-usuarios-bs (puerto 8181). Capa BS: reglas de negocio. Llama a su capa BD y a la capa BS de otros dominios. */
@SpringBootApplication(scanBasePackages = "cl.licitawatch")
public class UsuariosBsApplication {
    public static void main(String[] args) { SpringApplication.run(UsuariosBsApplication.class, args); }
}
