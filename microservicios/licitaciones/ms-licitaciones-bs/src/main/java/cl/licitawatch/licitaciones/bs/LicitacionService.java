package cl.licitawatch.licitaciones.bs;

import cl.licitawatch.common.ApiException;
import cl.licitawatch.common.InternalClient;
import cl.licitawatch.licitaciones.bs.Dto.*;
import com.fasterxml.jackson.databind.JsonNode;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import java.time.*;
import java.util.*;
import java.util.stream.Collectors;

/**
 * Lógica de Licitaciones: la postulación nace "Pendiente"; el Licitador la pasa a "Aprobada" o "Rechazada" y al aprobar una
 * la licitación pasa a "Adjudicada". Recién ahí se abre el chat (REST a la capa BS de Chat): no hay chat antes de adjudicar.
 * Los datos propios los entrega la capa BD (ms-licitaciones-bd); los de otros dominios (nombres, plan, conversación) se piden
 * por REST a la capa BS de cada uno y no se duplican en esta BD.
 */
@Service
public class LicitacionService {
    private static final String[] MESES = {"ene", "feb", "mar", "abr", "may", "jun", "jul", "ago", "sep", "oct", "nov", "dic"};
    // Filas tal como las entrega la capa BD.
    record Lic(Long id, Long licitadorId, String titulo, String descripcion, Integer rubroId, Integer regionId, Long presupuestoMin, Long presupuestoMax,
               Integer maxPostulantes, String imagenUrl, String archivoUrl, String archivoNombre, String tipoArchivo, LocalDate fechaCierre, String estado,
               Instant createdAt, long postulantes, Long pymeAdjudicadaId) {}
    record Post(Long id, Long licitacionId, Long pymeId, String mensaje, LocalDate fechaPostulacion, String estado, Instant updatedAt) {}

    private final InternalClient interno;
    private final String urlBd, urlUsuarios, urlVentas, urlChat, urlNotif;

    public LicitacionService(InternalClient interno, @Value("${lw.urls.bd}") String urlBd, @Value("${lw.urls.usuarios}") String urlUsuarios, @Value("${lw.urls.ventas}") String urlVentas,
                             @Value("${lw.urls.chat}") String urlChat, @Value("${lw.urls.notificaciones}") String urlNotif) {
        this.interno = interno; this.urlBd = urlBd; this.urlUsuarios = urlUsuarios; this.urlVentas = urlVentas; this.urlChat = urlChat; this.urlNotif = urlNotif;
    }

    /** Caché por solicitud para no repetir llamadas REST al armar una lista. */
    private final class Ctx {
        final Map<Long, JsonNode> usuarios = new HashMap<>(); final Map<Long, Boolean> premium = new HashMap<>(); Map<Long, Long> conversaciones = new HashMap<>();
        JsonNode usuario(long id) {
            return usuarios.computeIfAbsent(id, k -> { try { return interno.get(urlUsuarios + "/internal/usuarios/" + k + "/resumen", JsonNode.class); } catch (Exception e) { return com.fasterxml.jackson.databind.node.JsonNodeFactory.instance.objectNode(); } });
        }
        String nombre(long id) { return usuario(id).path("nombre").asText("Usuario"); }
        boolean esPremium(long pymeId) {
            return premium.computeIfAbsent(pymeId, k -> { try { return "Premium".equals(interno.get(urlVentas + "/internal/suscripciones/" + k, JsonNode.class).path("plan").path("nombre").asText()); } catch (Exception e) { return false; } });
        }
        void cargarConversaciones(Collection<Long> postulacionIds) {
            if (postulacionIds.isEmpty()) return;
            try {
                JsonNode n = interno.get(urlChat + "/internal/conversaciones/por-postulaciones?ids=" + junta(postulacionIds), JsonNode.class);
                n.fields().forEachRemaining(e -> conversaciones.put(Long.parseLong(e.getKey()), e.getValue().asLong()));
            } catch (Exception ignorada) { /* chat caído: se muestra sin enlace */ }
        }
    }

    // ---------- acceso a la capa BD ----------
    private Lic lic(long id) { return interno.get(urlBd + "/bd/licitaciones/" + id, Lic.class); }
    private Post post(long id) { return interno.get(urlBd + "/bd/postulaciones/" + id, Post.class); }
    private List<Lic> lics(String ruta) { return List.of(interno.get(urlBd + "/bd/licitaciones" + ruta, Lic[].class)); }
    private List<Post> posts(String filtro) { return List.of(interno.get(urlBd + "/bd/postulaciones" + filtro, Post[].class)); }
    private Lic estadoLic(long id, String estado) { return interno.put(urlBd + "/bd/licitaciones/" + id + "/estado", Map.of("estado", estado), Lic.class); }

    // ---------- mapeo ----------
    private static Instant finDelDia(LocalDate d) { return d.atTime(23, 59, 59).atZone(ZoneId.systemDefault()).toInstant(); }
    private static String estadoEfectivo(Lic l) { return "Abierta".equals(l.estado()) && l.fechaCierre().isBefore(LocalDate.now()) ? "Cerrada" : l.estado(); }

    private LicitacionDto dto(Lic l, Ctx c) {
        List<DocumentoDto> docs = l.archivoNombre() == null ? List.of() : List.of(new DocumentoDto(l.archivoNombre(), l.tipoArchivo() == null ? "Otro" : l.tipoArchivo(), 0));
        return new LicitacionDto(l.id(), l.licitadorId(), c.nombre(l.licitadorId()), l.titulo(), l.descripcion(), l.rubroId(), l.regionId(), l.presupuestoMin(),
                l.presupuestoMax(), l.maxPostulantes(), l.imagenUrl(), docs, finDelDia(l.fechaCierre()), estadoEfectivo(l), l.createdAt(), l.postulantes(), l.pymeAdjudicadaId());
    }
    private List<LicitacionDto> dtos(Collection<Lic> ls) { Ctx c = new Ctx(); return ls.stream().map(l -> dto(l, c)).toList(); }

    private PostulacionDto dto(Post p, Lic l, Ctx c) {
        boolean adj = es(p, "Aprobada") && es(l, "Adjudicada");
        JsonNode u = c.usuario(p.pymeId());
        return new PostulacionDto(p.id(), l.id(), l.titulo(), c.nombre(l.licitadorId()), p.pymeId(), c.nombre(p.pymeId()),
                u.hasNonNull("rubroId") ? u.get("rubroId").asInt() : null, u.hasNonNull("tamanoEmpresaId") ? u.get("tamanoEmpresaId").asInt() : null, c.esPremium(p.pymeId()),
                p.mensaje(), p.fechaPostulacion().atStartOfDay(ZoneId.systemDefault()).toInstant(), p.estado(), adj, p.updatedAt(), adj ? c.conversaciones.get(p.id()) : null);
    }
    private List<PostulacionDto> dtosPost(List<Post> ps, Map<Long, Lic> porId) {
        Ctx c = new Ctx(); c.cargarConversaciones(ps.stream().map(Post::id).toList());
        return ps.stream().map(p -> dto(p, porId.get(p.licitacionId()), c)).toList();
    }
    private Map<Long, Lic> porId(Collection<Long> ids) {
        return ids.isEmpty() ? Map.of() : lics("?ids=" + junta(ids)).stream().collect(Collectors.toMap(Lic::id, x -> x));
    }

    private static boolean es(Lic l, String estado) { return estado.equals(l.estado()); }
    private static boolean es(Post p, String estado) { return estado.equals(p.estado()); }

    // ---------- licitaciones ----------
    public LicitacionDto crear(long licitadorId, NuevaLicitacion d) {
        LocalDate cierre = d.fechaCierre().atZone(ZoneId.systemDefault()).toLocalDate();
        if (cierre.isBefore(LocalDate.now())) throw ApiException.invalido("La fecha de cierre debe ser futura");
        if (d.presupuestoMin() != null && d.presupuestoMax() != null && d.presupuestoMin() > d.presupuestoMax()) throw ApiException.invalido("El presupuesto mínimo no puede superar al máximo");
        // El ER guarda un documento complementario opcional: se toma el primero.
        DocumentoDto doc = d.documentos() == null || d.documentos().isEmpty() ? null : d.documentos().get(0);
        Map<String, Object> nueva = new HashMap<>();
        nueva.put("licitadorId", licitadorId); nueva.put("titulo", d.titulo().trim()); nueva.put("descripcion", d.descripcion().trim());
        nueva.put("rubroId", d.rubroId()); nueva.put("regionId", d.regionId()); nueva.put("presupuestoMin", d.presupuestoMin()); nueva.put("presupuestoMax", d.presupuestoMax());
        nueva.put("maxPostulantes", d.maxPostulantes()); nueva.put("imagenUrl", d.imagenUrl()); nueva.put("fechaCierre", cierre);
        nueva.put("archivoNombre", doc == null ? null : doc.nombre()); nueva.put("tipoArchivo", doc == null ? null : doc.tipo());
        Lic l = interno.post(urlBd + "/bd/licitaciones", nueva, Lic.class);
        interno.notificar(urlNotif, licitadorId, "Licitación publicada", "Licitación publicada", "Tu licitación \"" + l.titulo() + "\" ya es visible para las Pymes del rubro.", false);
        return dto(l, new Ctx());
    }

    public List<LicitacionDto> buscar(String q, Integer rubro, Integer region, String estado, Long maxP) {
        StringBuilder f = new StringBuilder("/buscar?q=").append(InternalClient.q(q == null ? "" : q.trim()));
        if (rubro != null) f.append("&rubroId=").append(rubro);
        if (region != null) f.append("&regionId=").append(region);
        if (maxP != null) f.append("&presupuestoMax=").append(maxP);
        return dtos(lics(f.toString())).stream().filter(x -> estado == null || estado.isBlank() || estado.equals(x.estado())).toList();
    }
    public LicitacionDto obtener(long id) { return dto(lic(id), new Ctx()); }
    public List<LicitacionDto> mias(long licitadorId) { return dtos(lics("?licitadorId=" + licitadorId)); }
    public List<LicitacionDto> todas() { return dtos(lics("")); }

    /**
     * El Licitador dueño puede borrar su licitación (p. ej. si se equivocó), pero solo mientras ninguna Pyme haya postulado:
     * con postulantes ya hay compromisos y cupos usados, así que debe cerrarla en vez de borrarla.
     */
    public void eliminar(long id, long usuarioId) {
        Lic l = lic(id);
        if (l.licitadorId() != usuarioId) throw ApiException.prohibido("Solo el Licitador dueño puede eliminar esta licitación");
        long n = l.postulantes();
        if (n > 0) throw ApiException.conflicto("No puedes eliminar esta licitación porque ya tiene " + n + (n == 1 ? " postulación" : " postulaciones")
                + ". Si ya no la necesitas, ciérrala para que no reciba más.");
        interno.delete(urlBd + "/bd/licitaciones/" + id);   // la capa BD responde 409 si una Pyme postuló justo en ese instante
    }

    public LicitacionDto cerrar(long id, long usuarioId, boolean admin) {
        Lic l = lic(id);
        if (!admin && l.licitadorId() != usuarioId) throw ApiException.prohibido("Solo el Licitador dueño puede cerrar esta licitación");
        if (!es(l, "Abierta")) throw ApiException.conflicto("La licitación ya no está abierta");
        return dto(estadoLic(id, "Cerrada"), new Ctx());
    }

    // ---------- postulaciones ----------
    public List<PostulacionDto> postulantes(long licitacionId, long usuarioId, boolean admin) {
        Lic l = lic(licitacionId);
        if (!admin && l.licitadorId() != usuarioId) throw ApiException.prohibido("No puedes ver las postulaciones de otra licitación");
        List<PostulacionDto> out = dtosPost(posts("?licitacionIds=" + licitacionId), Map.of(l.id(), l));
        return out.stream().sorted(Comparator.comparing((PostulacionDto p) -> !p.premium()).thenComparing(PostulacionDto::fecha)).toList();    // Premium primero
    }

    public PostulacionDto postular(long pymeId, long licitacionId, String mensaje) {
        Lic l = lic(licitacionId);
        if (!es(l, "Abierta") || l.fechaCierre().isBefore(LocalDate.now())) throw ApiException.conflicto("Esta licitación ya está cerrada");
        List<Post> deEsta = posts("?licitacionIds=" + licitacionId);
        if (deEsta.stream().anyMatch(p -> p.pymeId().equals(pymeId))) throw ApiException.conflicto("Ya postulaste a esta licitación");
        if (l.maxPostulantes() != null && deEsta.size() >= l.maxPostulantes()) throw ApiException.conflicto("La licitación alcanzó el máximo de postulantes");

        JsonNode sus = interno.get(urlVentas + "/internal/suscripciones/" + pymeId, JsonNode.class);          // límite según plan (3 Estándar / 7 Premium)
        int limite = sus.path("plan").path("postulacionesMes").asInt(3); boolean premium = "Premium".equals(sus.path("plan").path("nombre").asText());
        if (usadasMes(pymeId) >= limite) throw new ApiException(org.springframework.http.HttpStatus.UNPROCESSABLE_ENTITY, "Alcanzaste el límite de " + limite + " postulaciones este mes" + (premium ? "" : ". Pasa a Premium para postular más."));

        Map<String, Object> nueva = new HashMap<>();
        nueva.put("licitacionId", licitacionId); nueva.put("pymeId", pymeId); nueva.put("mensaje", mensaje);
        Post p = interno.post(urlBd + "/bd/postulaciones", nueva, Post.class);

        // El chat NO se abre al postular: solo cuando el Licitador aprueba y la licitación queda adjudicada (ver decidir).
        interno.notificar(urlNotif, l.licitadorId(), "Postulación recibida", "Nueva postulación recibida", "Una Pyme postuló a tu licitación \"" + l.titulo() + "\".", true);
        return dto(p, l, new Ctx());
    }

    public List<PostulacionDto> misPostulaciones(long pymeId) {
        List<Post> ps = posts("?pymeId=" + pymeId);
        return dtosPost(ps, porId(ps.stream().map(Post::licitacionId).collect(Collectors.toSet())));
    }

    public PostulacionDto decidir(long postulacionId, long licitadorId, String estado) {
        if (!"Aprobada".equals(estado) && !"Rechazada".equals(estado)) throw ApiException.invalido("Estado inválido");
        Post p = post(postulacionId); Lic l = lic(p.licitacionId());
        if (l.licitadorId() != licitadorId) throw ApiException.prohibido("Solo el Licitador dueño puede decidir");
        if (!es(p, "Pendiente")) throw ApiException.conflicto("Esta postulación ya fue revisada");
        boolean aprobar = "Aprobada".equals(estado);
        if (aprobar && !es(l, "Abierta")) throw ApiException.conflicto("La licitación ya no está abierta");
        p = interno.post(urlBd + "/bd/postulaciones/" + postulacionId + "/decision", Map.of("estado", estado), Post.class);   // al aprobar, la BD deja la licitación 'Adjudicada'
        if (aprobar) l = lic(l.id());
        interno.notificar(urlNotif, p.pymeId(), "Postulación " + estado.toLowerCase(), "Tu postulación fue " + (aprobar ? "aprobada" : "no seleccionada"),
                aprobar ? "El Licitador aprobó tu postulación a \"" + l.titulo() + "\" y la licitación te fue adjudicada. Ya puedes conversar por chat." : "Tu postulación a \"" + l.titulo() + "\" no fue seleccionada.", true);
        Ctx c = new Ctx();
        if (aprobar) abrirChat(p, l, c); else c.cargarConversaciones(List.of(p.id()));
        return dto(p, l, c);
    }

    /** Abre la conversación Licitador–Pyme adjudicada (Chat la crea una sola vez: postulacion_id es único). */
    private void abrirChat(Post p, Lic l, Ctx c) {
        try {
            Map<String, Object> conv = Map.of("postulacionId", p.id(), "licitadorId", l.licitadorId(), "pymeId", p.pymeId());
            c.conversaciones.put(p.id(), interno.post(urlChat + "/internal/conversaciones", conv, JsonNode.class).path("id").asLong());
        } catch (Exception e) { /* chat caído: la adjudicación igual queda; "adjudicar" vuelve a intentarlo */ }
    }

    /** Se mantiene por compatibilidad con el front: en el ER aprobar ya adjudica, así que solo confirma el estado. */
    public PostulacionDto adjudicar(long postulacionId, long licitadorId) {
        Post p = post(postulacionId); Lic l = lic(p.licitacionId());
        if (l.licitadorId() != licitadorId) throw ApiException.prohibido("Solo el Licitador dueño puede adjudicar");
        if (es(p, "Pendiente")) return decidir(postulacionId, licitadorId, "Aprobada");
        if (!es(p, "Aprobada")) throw ApiException.conflicto("Solo se puede adjudicar una postulación aprobada");
        Ctx c = new Ctx(); abrirChat(p, l, c);   // idempotente: si el chat estaba caído al aprobar, aquí se abre
        return dto(p, l, c);
    }

    // ---------- paneles ----------
    public ResumenLicitador resumenLicitador(long licitadorId) {
        List<Lic> mias = lics("?licitadorId=" + licitadorId);
        List<Post> recibidas = mias.isEmpty() ? List.of() : posts("?licitacionIds=" + junta(mias.stream().map(Lic::id).toList()));
        return new ResumenLicitador(mias.size(), mias.stream().filter(l -> "Abierta".equals(estadoEfectivo(l))).count(), mias.stream().filter(l -> es(l, "Adjudicada")).count(),
                recibidas.size(), recibidas.stream().filter(p -> es(p, "Pendiente")).count(), porMes(recibidas.stream().map(Post::fechaPostulacion).toList()),
                dtos(mias.stream().limit(3).toList()));
    }

    public ResumenPyme resumenPyme(long pymeId) {
        List<Post> mias = posts("?pymeId=" + pymeId);
        JsonNode sus = interno.get(urlVentas + "/internal/suscripciones/" + pymeId, JsonNode.class);
        Integer rubro = null; try { JsonNode u = interno.get(urlUsuarios + "/internal/usuarios/" + pymeId + "/resumen", JsonNode.class); if (u.hasNonNull("rubroId")) rubro = u.get("rubroId").asInt(); } catch (Exception ignorada) { }
        Set<Long> yaPostule = mias.stream().map(Post::licitacionId).collect(Collectors.toSet());
        final Integer rb = rubro;
        List<Lic> rec = lics("/buscar").stream().filter(l -> "Abierta".equals(estadoEfectivo(l)) && !yaPostule.contains(l.id()))
                .sorted(Comparator.comparing((Lic l) -> !Objects.equals(l.rubroId(), rb)).thenComparing(Lic::fechaCierre)).limit(4).toList();
        Map<Long, Lic> porId = porId(yaPostule);
        long adjudicadas = mias.stream().filter(p -> es(p, "Aprobada") && porId.containsKey(p.licitacionId()) && es(porId.get(p.licitacionId()), "Adjudicada")).count();
        return new ResumenPyme(mias.size(), count(mias, "Pendiente"), count(mias, "Aprobada"), count(mias, "Rechazada"), adjudicadas, usadasMes(pymeId),
                sus.path("plan").path("postulacionesMes").asLong(3), sus.path("plan").path("nombre").asText("Estándar"), porMes(mias.stream().map(Post::fechaPostulacion).toList()), dtos(rec));
    }

    // ---------- interno ----------
    public long usadasMes(long pymeId) {
        return interno.get(urlBd + "/bd/postulaciones/contar?pymeId=" + pymeId + "&desde=" + YearMonth.now().atDay(1), JsonNode.class).path("total").asLong();
    }

    public Map<String, Object> resumenGlobal() {
        List<Lic> todas = lics("");
        Map<String, Long> rubros = todas.stream().collect(Collectors.groupingBy(l -> String.valueOf(l.rubroId()), Collectors.counting()));
        long postulaciones = interno.get(urlBd + "/bd/postulaciones/contar", JsonNode.class).path("total").asLong();
        return Map.of("total", todas.size(), "abiertas", todas.stream().filter(l -> "Abierta".equals(estadoEfectivo(l))).count(), "adjudicadas", todas.stream().filter(l -> es(l, "Adjudicada")).count(),
                "postulaciones", postulaciones, "porRubro", rubros);
    }

    /** Para Chat: título de la licitación de cada postulación y si ya está adjudicada (solo entonces se habilita el chat). */
    public List<Map<String, Object>> resumenPostulaciones(List<Long> ids) {
        if (ids.isEmpty()) return List.of();
        List<Post> ps = posts("?ids=" + junta(ids));
        Map<Long, Lic> porId = porId(ps.stream().map(Post::licitacionId).collect(Collectors.toSet()));
        List<Map<String, Object>> out = new ArrayList<>();
        for (Post p : ps) {
            Lic l = porId.get(p.licitacionId());
            if (l == null) continue;
            out.add(Map.of("id", p.id(), "licitacionId", l.id(), "licitacionTitulo", l.titulo(), "adjudicada", es(p, "Aprobada") && es(l, "Adjudicada")));
        }
        return out;
    }

    public void eliminarUsuario(long id) { interno.delete(urlBd + "/bd/usuarios/" + id); }

    // ---------- utilidades ----------
    private static String junta(Collection<Long> ids) { return ids.stream().map(String::valueOf).collect(Collectors.joining(",")); }
    private static long count(List<Post> l, String estado) { return l.stream().filter(p -> es(p, estado)).count(); }
    private static List<PuntoMensual> porMes(List<LocalDate> fechas) {
        List<PuntoMensual> out = new ArrayList<>(); YearMonth ahora = YearMonth.now();
        for (int i = 5; i >= 0; i--) { YearMonth ym = ahora.minusMonths(i); out.add(new PuntoMensual(MESES[ym.getMonthValue() - 1], fechas.stream().filter(f -> YearMonth.from(f).equals(ym)).count())); }
        return out;
    }
}
