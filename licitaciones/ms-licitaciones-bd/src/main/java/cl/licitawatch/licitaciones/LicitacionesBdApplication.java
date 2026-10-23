package cl.licitawatch.licitaciones;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.data.jpa.repository.config.EnableJpaRepositories;

/** ms-licitaciones-bd (puerto 8282). Capa BD: entidades JPA y repositorios. Única capa conectada a PostgreSQL. */
@SpringBootApplication(scanBasePackages = "cl.licitawatch")
@EnableJpaRepositories(considerNestedRepositories = true)
public class LicitacionesBdApplication {
    public static void main(String[] args) { SpringApplication.run(LicitacionesBdApplication.class, args); }
}
