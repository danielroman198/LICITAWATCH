package cl.licitawatch.ventas.bd;

import cl.licitawatch.ventas.bd.Catalogos.*;
import cl.licitawatch.ventas.bd.Repos.*;
import org.springframework.boot.CommandLineRunner;
import org.springframework.stereotype.Component;

import java.util.List;

/** Carga los catálogos del ER si faltan (mismos datos que db/03_ventas.sql). */
@Component
public class Seeder implements CommandLineRunner {
    private final PlanRepo planes; private final EstadoSuscripcionRepo es; private final EstadoPagoRepo ep; private final MetodoPagoRepo mp;
    public Seeder(PlanRepo planes, EstadoSuscripcionRepo es, EstadoPagoRepo ep, MetodoPagoRepo mp) { this.planes = planes; this.es = es; this.ep = ep; this.mp = mp; }

    @Override public void run(String... args) {
        for (String n : List.of("Estándar", "Premium")) if (planes.findByNombre(n).isEmpty()) planes.save(new PlanSuscripcion(n));
        for (String n : List.of("Activa", "Vencida", "Cancelada")) if (es.findByNombre(n).isEmpty()) es.save(new EstadoSuscripcion(n));
        for (String n : List.of("Aprobado", "Rechazado", "Pendiente")) if (ep.findByNombre(n).isEmpty()) ep.save(new EstadoPago(n));
        for (String n : List.of("Crédito", "Débito")) if (mp.findByNombre(n).isEmpty()) mp.save(new MetodoPago(n));
    }
}
