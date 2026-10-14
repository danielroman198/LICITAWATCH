package cl.licitawatch.licitaciones;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.data.jpa.repository.config.EnableJpaRepositories;

@SpringBootApplication(scanBasePackages = "cl.licitawatch")
@EnableJpaRepositories(considerNestedRepositories = true)
public class LicitacionesApplication {
    public static void main(String[] args) { SpringApplication.run(LicitacionesApplication.class, args); }
}
