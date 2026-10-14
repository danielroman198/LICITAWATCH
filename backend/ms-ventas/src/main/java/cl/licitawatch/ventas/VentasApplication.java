package cl.licitawatch.ventas;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.data.jpa.repository.config.EnableJpaRepositories;

@SpringBootApplication(scanBasePackages = "cl.licitawatch")
@EnableJpaRepositories(considerNestedRepositories = true)
public class VentasApplication {
    public static void main(String[] args) { SpringApplication.run(VentasApplication.class, args); }
}
