package cl.licitawatch.ventas;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.data.jpa.repository.config.EnableJpaRepositories;

/** ms-ventas-bd (puerto 8283). Capa BD: entidades JPA y repositorios. Única capa conectada a PostgreSQL. */
@SpringBootApplication(scanBasePackages = "cl.licitawatch")
@EnableJpaRepositories(considerNestedRepositories = true)
public class VentasBdApplication {
    public static void main(String[] args) { SpringApplication.run(VentasBdApplication.class, args); }
}
