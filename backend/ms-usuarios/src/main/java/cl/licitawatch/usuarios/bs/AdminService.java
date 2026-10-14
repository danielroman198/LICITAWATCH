package cl.licitawatch.usuarios.bs;

import cl.licitawatch.common.ApiException;
import cl.licitawatch.common.InternalClient;
import cl.licitawatch.usuarios.bd.*;
import cl.licitawatch.usuarios.bd.Repos.*;
import cl.licitawatch.usuarios.bff.Dto.*;
import com.fasterxml.jackson.databind.JsonNode;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.*;
import java.util.*;

@Service
public class AdminService {
    private final UsuarioRepo usuarios; private final PerfilService perfiles; private final LicitadorRepo licitadores; private final PymeRepo pymes; private final AdministradorRepo admins; private final RubroRepo rubros; private final InternalClient interno;
    private final String urlVentas, urlLicitaciones;
    private static final String[] MESES = {"ene", "feb", "mar", "abr", "may", "jun", "jul", "ago", "sep", "oct", "nov", "dic"};

    public AdminService(UsuarioRepo usuarios, PerfilService perfiles, LicitadorRepo licitadores, PymeRepo pymes, AdministradorRepo admins, RubroRepo rubros, InternalClient interno,
                        @Value("${lw.urls.ventas}") String urlVentas, @Value("${lw.urls.licitaciones}") String urlLicitaciones) {
        this.usuarios = usuarios; this.perfiles = perfiles; this.licitadores = licitadores; this.pymes = pymes; this.admins = admins; this.rubros = rubros; this.interno = interno; this.urlVentas = urlVentas; this.urlLicitaciones = urlLicitaciones;
    }

    public List<UsuarioAdmin> listar(String q, String rol, String estado) {
        JsonNode planes = safe(urlVentas + "/internal/ventas/planes");     // {"12":"Premium",...}
        String t = q == null ? "" : q.toLowerCase().replace(".", "");
        List<UsuarioAdmin> out = new ArrayList<>();
        for (Usuario u : usuarios.findAll()) {
            if ("ADMIN".equals(u.getRolNombre())) continue;
            if (rol != null && !rol.isBlank() && !rol.equals(u.getRolNombre())) continue;
            if ("activos".equals(estado) && !u.isActivo()) continue;
            if ("bloqueados".equals(estado) && u.isActivo()) continue;
            PerfilBase p = perfiles.empresa(u).orElse(null);
            String nombre = p != null ? p.getRazonSocial() : u.getEmail();
            String hay = (nombre + " " + u.getEmail() + " " + (p != null ? p.getRut() : "")).toLowerCase();
            if (!t.isBlank() && !hay.contains(t)) continue;
            String plan = "PYME".equals(u.getRolNombre()) ? (planes != null && planes.has(String.valueOf(u.getId())) ? planes.get(String.valueOf(u.getId())).asText() : "Estándar") : null;
            out.add(new UsuarioAdmin(Mapeo.usuario(u), nombre, p != null ? Rut.formatear(p.getRut()) : null, plan));
        }
        out.sort(Comparator.comparing((UsuarioAdmin a) -> a.usuario().createdAt()).reversed());
        return out;
    }

    @Transactional
    public void cambiarEstado(long id, boolean activo) {
        Usuario u = usuarios.findById(id).orElseThrow(() -> ApiException.noEncontrado("Usuario no encontrado"));
        if ("ADMIN".equals(u.getRolNombre())) throw ApiException.prohibido("No se puede bloquear a un administrador");
        u.setActivo(activo);
    }

    @Transactional
    public void eliminar(long id) {
        Usuario u = usuarios.findById(id).orElseThrow(() -> ApiException.noEncontrado("Usuario no encontrado"));
        if ("ADMIN".equals(u.getRolNombre())) throw ApiException.prohibido("No se puede eliminar a un administrador");
        licitadores.deleteByUsuarioId(id); pymes.deleteByUsuarioId(id); usuarios.delete(u);
        // Limpieza best-effort en los demás servicios (sus datos referencian al usuario por id, sin FK).
        for (String url : List.of(urlLicitaciones, urlVentas)) { try { interno.post(url + "/internal/usuarios/" + id + "/eliminar", Map.of(), Void.class); } catch (Exception ignorada) { } }
    }

    public Map<String, Object> estadisticas() {
        List<Usuario> todos = usuarios.findAll();
        long lic = todos.stream().filter(u -> "LICITADOR".equals(u.getRolNombre())).count(), pym = todos.stream().filter(u -> "PYME".equals(u.getRolNombre())).count();
        JsonNode v = safe(urlVentas + "/internal/ventas/resumen"), l = safe(urlLicitaciones + "/internal/licitaciones/resumen");
        long premium = v != null ? v.path("pymesPremium").asLong() : 0;
        Map<String, Object> m = new LinkedHashMap<>();
        m.put("usuariosTotal", lic + pym); m.put("licitadores", lic); m.put("pymes", pym); m.put("bloqueados", usuarios.countByActivoFalse());
        m.put("licitacionesTotal", l != null ? l.path("total").asLong() : 0); m.put("licitacionesAbiertas", l != null ? l.path("abiertas").asLong() : 0);
        m.put("licitacionesAdjudicadas", l != null ? l.path("adjudicadas").asLong() : 0); m.put("postulacionesTotal", l != null ? l.path("postulaciones").asLong() : 0);
        m.put("suscripcionesActivas", premium); m.put("pymesPremium", premium); m.put("pymesEstandar", Math.max(0, pym - premium));
        m.put("ingresosMes", v != null ? v.path("ingresosMes").asLong() : 0); m.put("ingresosTotal", v != null ? v.path("ingresosTotal").asLong() : 0);
        m.put("ingresosPorMes", v != null && v.has("ingresosPorMes") ? v.get("ingresosPorMes") : List.of());
        m.put("registrosPorMes", registrosPorMes(todos));
        List<Map<String, Object>> porRubro = new ArrayList<>();
        if (l != null && l.has("porRubro")) l.get("porRubro").fields().forEachRemaining(e -> rubros.findById(Integer.parseInt(e.getKey()))
                .ifPresent(c -> porRubro.add(Map.of("rubro", c.getNombre(), "valor", e.getValue().asLong()))));
        porRubro.sort((a, b) -> Long.compare((long) b.get("valor"), (long) a.get("valor")));
        m.put("licitacionesPorRubro", porRubro.size() > 6 ? porRubro.subList(0, 6) : porRubro);
        return m;
    }

    private List<Map<String, Object>> registrosPorMes(List<Usuario> todos) {
        List<Map<String, Object>> out = new ArrayList<>();
        YearMonth ahora = YearMonth.now();
        for (int i = 5; i >= 0; i--) {
            YearMonth ym = ahora.minusMonths(i);
            long n = todos.stream().filter(u -> !"ADMIN".equals(u.getRolNombre()) && YearMonth.from(u.getCreatedAt().atZone(ZoneId.systemDefault())).equals(ym)).count();
            out.add(Map.of("mes", MESES[ym.getMonthValue() - 1], "valor", n));
        }
        return out;
    }

    private JsonNode safe(String url) { try { return interno.get(url, JsonNode.class); } catch (Exception e) { return null; } }
}
