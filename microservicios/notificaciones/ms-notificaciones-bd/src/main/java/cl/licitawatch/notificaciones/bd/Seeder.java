package cl.licitawatch.notificaciones.bd;

import org.springframework.boot.CommandLineRunner;
import org.springframework.stereotype.Component;

import java.util.List;

/** Carga el catálogo tipo_notificacion del ER si falta (mismos datos que db/05_notificaciones.sql). */
@Component
public class Seeder implements CommandLineRunner {
    public static final List<String> TIPOS = List.of("Licitación publicada", "Postulación recibida", "Postulación aprobada", "Postulación rechazada", "Pago confirmado", "Mensaje nuevo", "Licitación de tu rubro");
    private final TipoRepo tipos;
    public Seeder(TipoRepo tipos) { this.tipos = tipos; }
    @Override public void run(String... args) { for (String n : TIPOS) if (tipos.findByNombre(n).isEmpty()) tipos.save(new TipoNotificacion(n)); }
}
