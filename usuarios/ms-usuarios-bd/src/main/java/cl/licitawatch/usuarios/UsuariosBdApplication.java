package cl.licitawatch.usuarios;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.data.jpa.repository.config.EnableJpaRepositories;

/** ms-usuarios-bd (puerto 8281). Capa BD: entidades JPA y repositorios. Única capa conectada a PostgreSQL. */
@SpringBootApplication(scanBasePackages = "cl.licitawatch")
@EnableJpaRepositories(considerNestedRepositories = true)
public class UsuariosBdApplication {
    public static void main(String[] args) { SpringApplication.run(UsuariosBdApplication.class, args); }
}
