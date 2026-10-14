package cl.licitawatch.usuarios;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.data.jpa.repository.config.EnableJpaRepositories;

@SpringBootApplication(scanBasePackages = "cl.licitawatch")
@EnableJpaRepositories(considerNestedRepositories = true)
public class UsuariosApplication {
    public static void main(String[] args) { SpringApplication.run(UsuariosApplication.class, args); }
}
