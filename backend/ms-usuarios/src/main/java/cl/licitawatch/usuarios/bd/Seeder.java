package cl.licitawatch.usuarios.bd;

import cl.licitawatch.usuarios.bd.Catalogos.*;
import cl.licitawatch.usuarios.bd.Repos.*;
import cl.licitawatch.usuarios.bs.AuthService;
import org.springframework.boot.CommandLineRunner;
import org.springframework.stereotype.Component;

import java.util.*;

/** Carga (si faltan) roles, catálogos y la cuenta del administrador. Los mismos datos están en db/01_usuarios.sql. */
@Component
public class Seeder implements CommandLineRunner {
    private final RolRepo roles; private final UsuarioRepo usuarios; private final AdministradorRepo admins; private final RubroRepo rubros;
    private final RegionRepo regiones; private final CiudadRepo ciudades; private final TamanoRepo tamanos; private final AuthService auth;

    public Seeder(RolRepo roles, UsuarioRepo usuarios, AdministradorRepo admins, RubroRepo rubros, RegionRepo regiones, CiudadRepo ciudades, TamanoRepo tamanos, AuthService auth) {
        this.roles = roles; this.usuarios = usuarios; this.admins = admins; this.rubros = rubros; this.regiones = regiones; this.ciudades = ciudades; this.tamanos = tamanos; this.auth = auth;
    }

    @Override
    public void run(String... args) {
        for (String r : List.of("LICITADOR", "PYME", "ADMIN")) if (roles.findByNombre(r).isEmpty()) roles.save(new Rol(r));
        if (rubros.count() == 0)
            for (String r : List.of("Aseo y Mantención", "Alimentos y Casino", "Construcción", "Educación y Capacitación", "Energía", "Logística y Transporte", "Marketing y Publicidad",
                    "Minería", "Salud", "Seguridad", "Servicios Legales y Contables", "Tecnología", "Textil y Vestuario", "Turismo y Eventos", "Mantención Industrial", "Agricultura", "Telecomunicaciones", "Consultoría", "Medio Ambiente", "Otros"))
                rubros.save(new Rubro(r));
        if (tamanos.count() == 0) for (String t : List.of("Pequeña", "Mediana", "Grande")) tamanos.save(new TamanoEmpresa(t));
        if (regiones.count() == 0) {
            Map<String, List<String>> reg = new LinkedHashMap<>();
            reg.put("Arica y Parinacota", List.of("Arica")); reg.put("Tarapacá", List.of("Iquique")); reg.put("Antofagasta", List.of("Antofagasta", "Calama"));
            reg.put("Atacama", List.of("Copiapó")); reg.put("Coquimbo", List.of("La Serena", "Coquimbo")); reg.put("Valparaíso", List.of("Valparaíso", "Viña del Mar"));
            reg.put("Metropolitana de Santiago", List.of("Santiago")); reg.put("O'Higgins", List.of("Rancagua"));
            reg.put("Maule", List.of("Talca", "Curicó")); reg.put("Ñuble", List.of("Chillán")); reg.put("Biobío", List.of("Concepción", "Los Ángeles"));
            reg.put("La Araucanía", List.of("Temuco")); reg.put("Los Ríos", List.of("Valdivia")); reg.put("Los Lagos", List.of("Puerto Montt", "Osorno"));
            reg.put("Aysén", List.of("Coyhaique")); reg.put("Magallanes", List.of("Punta Arenas"));
            reg.forEach((nombre, cs) -> { Region r = regiones.save(new Region(nombre)); cs.forEach(c -> ciudades.save(new Ciudad(c, r.getId()))); });
        }
        if (!usuarios.existsByEmailIgnoreCase("admin@licitawatch.cl")) {
            Usuario a = new Usuario(); a.setEmail("admin@licitawatch.cl"); a.setRol(roles.findByNombre("ADMIN").orElseThrow());
            a.setPassword(auth.hash(System.getenv().getOrDefault("ADMIN_PASSWORD", "Admin123!")));
            a = usuarios.save(a);
            Administrador ad = new Administrador(); ad.setUsuarioId(a.getId()); ad.setNombre("Equipo LicitaWatch"); ad.setArea("Administración");
            admins.save(ad);
        }
    }
}
