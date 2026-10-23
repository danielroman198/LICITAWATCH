package cl.licitawatch.chat;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;

/** ms-chat-bff (puerto 8085). Capa BFF: recibe las peticiones del front (vía API Gateway), valida el JWT y el rol, y llama a la capa BS. */
@SpringBootApplication(scanBasePackages = "cl.licitawatch")
public class ChatBffApplication {
    public static void main(String[] args) { SpringApplication.run(ChatBffApplication.class, args); }
}
