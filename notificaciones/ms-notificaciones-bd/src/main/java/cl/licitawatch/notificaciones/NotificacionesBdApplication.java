package cl.licitawatch.notificaciones;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.data.jpa.repository.config.EnableJpaRepositories;

/** ms-notificaciones-bd (puerto 8284). Capa BD: entidades JPA y repositorios. Única capa conectada a PostgreSQL. */
@SpringBootApplication(scanBasePackages = "cl.licitawatch")
@EnableJpaRepositories(considerNestedRepositories = true)
public class NotificacionesBdApplication {
    public static void main(String[] args) { SpringApplication.run(NotificacionesBdApplication.class, args); }
}
