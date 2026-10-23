package cl.licitawatch.usuarios.bs;

import cl.licitawatch.common.ApiException;
import cl.licitawatch.common.InternalClient;
import cl.licitawatch.usuarios.bs.Dto.*;
import cl.licitawatch.usuarios.bs.UsuariosBd.CatalogoFila;
import cl.licitawatch.usuarios.bs.UsuariosBd.PerfilFila;
import cl.licitawatch.usuarios.bs.UsuariosBd.UsuarioFila;
import com.fasterxml.jackson.databind.JsonNode;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import java.time.*;
import java.util.*;
import java.util.stream.Collectors;

@Service
public class AdminService {
    private final UsuariosBd bd; private final InternalClient interno;
    private final String urlVentas, urlLicitaciones;
    private static final String[] MESES = {"ene", "feb", "mar", "abr", "may", "jun", "jul", "ago", "sep", "oct", "nov", "dic"};

    public AdminService(UsuariosBd bd, InternalClient interno, @Value("${lw.urls.ventas}") String urlVentas, @Value("${lw.urls.licitaciones}") String urlLicitaciones) {
        this.bd = bd; this.interno = interno; this.urlVentas = urlVentas; this.urlLicitaciones = urlLicitaciones;
    }

    public List<UsuarioAdmin> listar(String q, String rol, String estado) {
        JsonNode planes = safe(urlVentas + "/internal/ventas/planes");     // {"12":"Premium",...}
        Map<Long, PerfilFila> perfiles = bd.perfiles().stream().filter(PerfilFila::esEmpresa).collect(Collectors.toMap(PerfilFila::usuarioId, p -> p, (a, b) -> a));
        String t = q == null ? "" : q.toLowerCase().replace(".", "");
        List<UsuarioAdmin> out = new ArrayList<>();
        for (UsuarioFila u : bd.usuarios()) {
            if ("ADMIN".equals(u.rol())) continue;
            if (rol != null && !rol.isBlank() && !rol.equals(u.rol())) continue;
            if ("activos".equals(estado) && !u.activo()) continue;
            if ("bloqueados".equals(estado) && u.activo()) continue;
            PerfilFila p = perfiles.get(u.id());
            String nombre = p != null ? p.razonSocial() : u.email();
            String hay = (nombre + " " + u.email() + " " + (p != null ? p.rut() : "")).toLowerCase();
            if (!t.isBlank() && !hay.contains(t)) continue;
            String plan = "PYME".equals(u.rol()) ? (planes != null && planes.has(String.valueOf(u.id())) ? planes.get(String.valueOf(u.id())).asText() : "Estándar") : null;
            out.add(new UsuarioAdmin(Mapeo.usuario(u), nombre, p != null ? Rut.formatear(p.rut()) : null, plan));
        }
        out.sort(Comparator.comparing((UsuarioAdmin a) -> a.usuario().createdAt()).reversed());
        return out;
    }

    public void cambiarEstado(long id, boolean activo) {
        UsuarioFila u = bd.usuario(id);
        if ("ADMIN".equals(u.rol())) throw ApiException.prohibido("No se puede bloquear a un administrador");
        bd.cambiar(id, activo, null, null);
    }

    public void eliminar(long id) {
        UsuarioFila u = bd.usuario(id);
        if ("ADMIN".equals(u.rol())) throw ApiException.prohibido("No se puede eliminar a un administrador");
        bd.eliminar(id);
        // Limpieza best-effort en los demás servicios (sus datos referencian al usuario por id, sin FK).
        for (String url : List.of(urlLicitaciones, urlVentas)) { try { interno.post(url + "/internal/usuarios/" + id + "/eliminar", Map.of(), Void.class); } catch (Exception ignorada) { } }
    }

    public Map<String, Object> estadisticas() {
        List<UsuarioFila> todos = bd.usuarios();
        long lic = todos.stream().filter(u -> "LICITADOR".equals(u.rol())).count(), pym = todos.stream().filter(u -> "PYME".equals(u.rol())).count();
        JsonNode v = safe(urlVentas + "/internal/ventas/resumen"), l = safe(urlLicitaciones + "/internal/licitaciones/resumen");
        long premium = v != null ? v.path("pymesPremium").asLong() : 0;
        Map<String, Object> m = new LinkedHashMap<>();
        m.put("usuariosTotal", lic + pym); m.put("licitadores", lic); m.put("pymes", pym); m.put("bloqueados", todos.stream().filter(u -> !u.activo()).count());
        m.put("licitacionesTotal", l != null ? l.path("total").asLong() : 0); m.put("licitacionesAbiertas", l != null ? l.path("abiertas").asLong() : 0);
        m.put("licitacionesAdjudicadas", l != null ? l.path("adjudicadas").asLong() : 0); m.put("postulacionesTotal", l != null ? l.path("postulaciones").asLong() : 0);
        m.put("suscripcionesActivas", premium); m.put("pymesPremium", premium); m.put("pymesEstandar", Math.max(0, pym - premium));
        m.put("ingresosMes", v != null ? v.path("ingresosMes").asLong() : 0); m.put("ingresosTotal", v != null ? v.path("ingresosTotal").asLong() : 0);
        m.put("ingresosPorMes", v != null && v.has("ingresosPorMes") ? v.get("ingresosPorMes") : List.of());
        m.put("registrosPorMes", registrosPorMes(todos));
        Map<String, String> rubros = bd.rubros().stream().collect(Collectors.toMap(c -> String.valueOf(c.id()), CatalogoFila::nombre));
        List<Map<String, Object>> porRubro = new ArrayList<>();
        if (l != null && l.has("porRubro")) l.get("porRubro").fields().forEachRemaining(e -> {
            if (rubros.containsKey(e.getKey())) porRubro.add(Map.of("rubro", rubros.get(e.getKey()), "valor", e.getValue().asLong()));
        });
        porRubro.sort((a, b) -> Long.compare((long) b.get("valor"), (long) a.get("valor")));
        m.put("licitacionesPorRubro", porRubro.size() > 6 ? porRubro.subList(0, 6) : porRubro);
        return m;
    }

    private List<Map<String, Object>> registrosPorMes(List<UsuarioFila> todos) {
        List<Map<String, Object>> out = new ArrayList<>();
        YearMonth ahora = YearMonth.now();
        for (int i = 5; i >= 0; i--) {
            YearMonth ym = ahora.minusMonths(i);
            long n = todos.stream().filter(u -> !"ADMIN".equals(u.rol()) && YearMonth.from(u.createdAt().atZone(ZoneId.systemDefault())).equals(ym)).count();
            out.add(Map.of("mes", MESES[ym.getMonthValue() - 1], "valor", n));
        }
        return out;
    }

    private JsonNode safe(String url) { try { return interno.get(url, JsonNode.class); } catch (Exception e) { return null; } }
}
