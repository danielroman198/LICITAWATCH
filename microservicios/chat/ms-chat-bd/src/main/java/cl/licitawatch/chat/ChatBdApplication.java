package cl.licitawatch.chat;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.data.jpa.repository.config.EnableJpaRepositories;

/** ms-chat-bd (puerto 8285). Capa BD: entidades JPA y repositorios. Única capa conectada a PostgreSQL. */
@SpringBootApplication(scanBasePackages = "cl.licitawatch")
@EnableJpaRepositories(considerNestedRepositories = true)
public class ChatBdApplication {
    public static void main(String[] args) { SpringApplication.run(ChatBdApplication.class, args); }
}
