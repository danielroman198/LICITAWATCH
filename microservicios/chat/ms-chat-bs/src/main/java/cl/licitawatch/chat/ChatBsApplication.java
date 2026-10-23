package cl.licitawatch.chat;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;

/** ms-chat-bs (puerto 8185). Capa BS: reglas de negocio. Llama a su capa BD y a la capa BS de otros dominios. */
@SpringBootApplication(scanBasePackages = "cl.licitawatch")
public class ChatBsApplication {
    public static void main(String[] args) { SpringApplication.run(ChatBsApplication.class, args); }
}
