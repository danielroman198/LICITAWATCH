package cl.licitawatch.licitaciones.bd;

import cl.licitawatch.licitaciones.bd.Catalogos.*;
import cl.licitawatch.licitaciones.bd.Repos.*;
import org.springframework.boot.CommandLineRunner;
import org.springframework.stereotype.Component;

import java.util.List;

/** Carga los catálogos del ER si faltan (mismos datos que db/02_licitaciones.sql). */
@Component
public class Seeder implements CommandLineRunner {
    private final EstadoLicitacionRepo el; private final EstadoPostulacionRepo ep; private final TipoArchivoRepo ta;
    public Seeder(EstadoLicitacionRepo el, EstadoPostulacionRepo ep, TipoArchivoRepo ta) { this.el = el; this.ep = ep; this.ta = ta; }

    @Override public void run(String... args) {
        for (String n : List.of("Abierta", "Cerrada", "Adjudicada")) if (el.findByNombre(n).isEmpty()) el.save(new EstadoLicitacion(n));
        for (String n : List.of("Pendiente", "Aprobada", "Rechazada")) if (ep.findByNombre(n).isEmpty()) ep.save(new EstadoPostulacion(n));
        for (String n : List.of("PDF", "DOCX", "XLSX", "Otro")) if (ta.findByNombre(n).isEmpty()) ta.save(new TipoArchivo(n));
    }
}
