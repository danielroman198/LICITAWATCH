package cl.licitawatch.licitaciones.bs;

import cl.licitawatch.common.ApiException;
import cl.licitawatch.common.InternalClient;
import cl.licitawatch.licitaciones.bd.*;
import cl.licitawatch.licitaciones.bd.Catalogos.*;
import cl.licitawatch.licitaciones.bd.Repos.*;
import cl.licitawatch.licitaciones.bff.Dto.*;
import com.fasterxml.jackson.databind.JsonNode;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.*;
import java.util.*;
import java.util.stream.Collectors;

/**
 * Lógica de Licitaciones: la postulación nace "Pendiente"; el Licitador la pasa a "Aprobada" o "Rechazada" y al aprobar una
 * la licitación pasa a "Adjudicada". Recién ahí se abre el chat (REST a MS-Chat): plan de negocio, no hay chat antes de adjudicar.
 * Los datos de otros servicios (nombres, plan, conversación) se piden por REST y no se duplican en esta BD.
 */
@Service
public class LicitacionService {
    private static final String[] MESES = {"ene", "feb", "mar", "abr", "may", "jun", "jul", "ago", "sep", "oct", "nov", "dic"};
    private final LicitacionRepo lics; private final PostulacionRepo posts; private final EstadoLicitacionRepo estadosLic; private final EstadoPostulacionRepo estadosPost;
    private final TipoArchivoRepo tipos; private final InternalClient interno;
    private final String urlUsuarios, urlVentas, urlChat, urlNotif;

    public LicitacionService(LicitacionRepo lics, PostulacionRepo posts, EstadoLicitacionRepo estadosLic, EstadoPostulacionRepo estadosPost, TipoArchivoRepo tipos, InternalClient interno,
                             @Value("${lw.urls.usuarios}") String urlUsuarios, @Value("${lw.urls.ventas}") String urlVentas, @Value("${lw.urls.chat}") String urlChat,
                             @Value("${lw.urls.notificaciones}") String urlNotif) {
        this.lics = lics; this.posts = posts; this.estadosLic = estadosLic; this.estadosPost = estadosPost; this.tipos = tipos; this.interno = interno;
        this.urlUsuarios = urlUsuarios; this.urlVentas = urlVentas; this.urlChat = urlChat; this.urlNotif = urlNotif;
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
                JsonNode n = interno.get(urlChat + "/internal/conversaciones/por-postulaciones?ids=" + postulacionIds.stream().map(String::valueOf).collect(Collectors.joining(",")), JsonNode.class);
                n.fields().forEachRemaining(e -> conversaciones.put(Long.parseLong(e.getKey()), e.getValue().asLong()));
            } catch (Exception ignorada) { /* chat caído: se muestra sin enlace */ }
        }
    }

    // ---------- mapeo ----------
    private static Instant finDelDia(LocalDate d) { return d.atTime(23, 59, 59).atZone(ZoneId.systemDefault()).toInstant(); }
    private static Long aLong(BigDecimal b) { return b == null ? null : b.longValue(); }
    private static BigDecimal aDec(Long l) { return l == null ? null : BigDecimal.valueOf(l); }
    private String estadoEfectivo(Licitacion l) { return "Abierta".equals(l.getEstado().getNombre()) && l.getFechaCierre().isBefore(LocalDate.now()) ? "Cerrada" : l.getEstado().getNombre(); }

    private LicitacionDto dto(Licitacion l, Ctx c) {
        List<DocumentoDto> docs = l.getArchivoNombre() == null ? List.of() : List.of(new DocumentoDto(l.getArchivoNombre(), l.getTipoArchivo() == null ? "Otro" : l.getTipoArchivo().getNombre(), 0));
        Long adjudicada = null;
        if ("Adjudicada".equals(l.getEstado().getNombre()))
            adjudicada = posts.findByLicitacionId(l.getId()).stream().filter(p -> "Aprobada".equals(p.getEstado().getNombre())).map(Postulacion::getPymeId).findFirst().orElse(null);
        return new LicitacionDto(l.getId(), l.getLicitadorId(), c.nombre(l.getLicitadorId()), l.getTitulo(), l.getDescripcion(), l.getRubroId(), l.getRegionId(), aLong(l.getPresupuestoMin()),
                aLong(l.getPresupuestoMax()), l.getMaxPostulantes(), l.getImagenUrl(), docs, finDelDia(l.getFechaCierre()), estadoEfectivo(l), l.getCreatedAt(),
                posts.countByLicitacionId(l.getId()), adjudicada);
    }
    private List<LicitacionDto> dtos(Collection<Licitacion> ls) { Ctx c = new Ctx(); return ls.stream().map(l -> dto(l, c)).toList(); }

    private PostulacionDto dto(Postulacion p, Licitacion l, Ctx c) {
        boolean adj = "Aprobada".equals(p.getEstado().getNombre()) && "Adjudicada".equals(l.getEstado().getNombre());
        JsonNode u = c.usuario(p.getPymeId());
        return new PostulacionDto(p.getId(), l.getId(), l.getTitulo(), c.nombre(l.getLicitadorId()), p.getPymeId(), c.nombre(p.getPymeId()),
                u.hasNonNull("rubroId") ? u.get("rubroId").asInt() : null, u.hasNonNull("tamanoEmpresaId") ? u.get("tamanoEmpresaId").asInt() : null, c.esPremium(p.getPymeId()),
                p.getMensaje(), p.getFechaPostulacion().atStartOfDay(ZoneId.systemDefault()).toInstant(), p.getEstado().getNombre(), adj, p.getUpdatedAt(), adj ? c.conversaciones.get(p.getId()) : null);
    }
    private List<PostulacionDto> dtosPost(List<Postulacion> ps, Map<Long, Licitacion> porId) {
        Ctx c = new Ctx(); c.cargarConversaciones(ps.stream().map(Postulacion::getId).toList());
        return ps.stream().map(p -> dto(p, porId.get(p.getLicitacionId()), c)).toList();
    }

    private Licitacion lic(long id) { return lics.findById(id).orElseThrow(() -> ApiException.noEncontrado("Licitación no encontrada")); }
    private Postulacion post(long id) { return posts.findById(id).orElseThrow(() -> ApiException.noEncontrado("Postulación no encontrada")); }
    private EstadoLicitacion el(String n) { return estadosLic.findByNombre(n).orElseThrow(() -> ApiException.invalido("Estado de licitación inexistente: " + n)); }
    private EstadoPostulacion ep(String n) { return estadosPost.findByNombre(n).orElseThrow(() -> ApiException.invalido("Estado de postulación inexistente: " + n)); }
    private static boolean es(Licitacion l, String estado) { return estado.equals(l.getEstado().getNombre()); }
    private static boolean es(Postulacion p, String estado) { return estado.equals(p.getEstado().getNombre()); }

    // ---------- licitaciones ----------
    @Transactional
    public LicitacionDto crear(long licitadorId, NuevaLicitacion d) {
        LocalDate cierre = d.fechaCierre().atZone(ZoneId.systemDefault()).toLocalDate();
        if (cierre.isBefore(LocalDate.now())) throw ApiException.invalido("La fecha de cierre debe ser futura");
        if (d.presupuestoMin() != null && d.presupuestoMax() != null && d.presupuestoMin() > d.presupuestoMax()) throw ApiException.invalido("El presupuesto mínimo no puede superar al máximo");
        Licitacion l = new Licitacion();
        l.setLicitadorId(licitadorId); l.setTitulo(d.titulo().trim()); l.setDescripcion(d.descripcion().trim());
        l.setRubroId(d.rubroId()); l.setRegionId(d.regionId()); l.setPresupuestoMin(aDec(d.presupuestoMin())); l.setPresupuestoMax(aDec(d.presupuestoMax()));
        l.setMaxPostulantes(d.maxPostulantes()); l.setImagenUrl(d.imagenUrl()); l.setFechaCierre(cierre); l.setEstado(el("Abierta"));
        // El ER guarda un documento complementario opcional (archivo_url / archivo_nombre / tipo_archivo_id); se toma el primero.
        if (d.documentos() != null && !d.documentos().isEmpty()) {
            DocumentoDto x = d.documentos().get(0);
            l.setArchivoNombre(x.nombre()); l.setArchivoUrl("/archivos/" + x.nombre());
            l.setTipoArchivo(tipos.findByNombre(x.tipo() == null ? "Otro" : x.tipo()).orElseGet(() -> tipos.findByNombre("Otro").orElse(null)));
        }
        l = lics.save(l);
        interno.notificar(urlNotif, licitadorId, "Licitación publicada", "Licitación publicada", "Tu licitación \"" + l.getTitulo() + "\" ya es visible para las Pymes del rubro.", false);
        return dto(l, new Ctx());
    }

    public List<LicitacionDto> buscar(String q, Integer rubro, Integer region, String estado, Long maxP) {
        List<Licitacion> r = lics.buscar(blank(q), rubro, region, aDec(maxP));
        return dtos(r).stream().filter(x -> estado == null || estado.isBlank() || estado.equals(x.estado())).toList();
    }
    public LicitacionDto obtener(long id) { return dto(lic(id), new Ctx()); }
    public List<LicitacionDto> mias(long licitadorId) { return dtos(lics.findByLicitadorIdOrderByCreatedAtDesc(licitadorId)); }
    public List<LicitacionDto> todas() { return dtos(lics.findAllByOrderByCreatedAtDesc()); }

    /**
     * El Licitador dueño puede borrar su licitación (p. ej. si se equivocó), pero solo mientras ninguna Pyme haya postulado:
     * con postulantes ya hay compromisos y cupos usados, así que debe cerrarla en vez de borrarla.
     */
    @Transactional
    public void eliminar(long id, long usuarioId) {
        Licitacion l = lic(id);
        if (l.getLicitadorId() != usuarioId) throw ApiException.prohibido("Solo el Licitador dueño puede eliminar esta licitación");
        long n = posts.countByLicitacionId(id);
        if (n > 0) throw ApiException.conflicto("No puedes eliminar esta licitación porque ya tiene " + n + (n == 1 ? " postulación" : " postulaciones")
                + ". Si ya no la necesitas, ciérrala para que no reciba más.");
        try { lics.delete(l); lics.flush(); }
        catch (org.springframework.dao.DataIntegrityViolationException e) {   // una Pyme postuló justo en ese instante (FK postulacion -> licitacion)
            throw ApiException.conflicto("Una Pyme acaba de postular a esta licitación, por lo que ya no se puede eliminar.");
        }
    }

    @Transactional
    public LicitacionDto cerrar(long id, long usuarioId, boolean admin) {
        Licitacion l = lic(id);
        if (!admin && l.getLicitadorId() != usuarioId) throw ApiException.prohibido("Solo el Licitador dueño puede cerrar esta licitación");
        if (!es(l, "Abierta")) throw ApiException.conflicto("La licitación ya no está abierta");
        l.setEstado(el("Cerrada"));
        return dto(l, new Ctx());
    }

    // ---------- postulaciones ----------
    public List<PostulacionDto> postulantes(long licitacionId, long usuarioId, boolean admin) {
        Licitacion l = lic(licitacionId);
        if (!admin && l.getLicitadorId() != usuarioId) throw ApiException.prohibido("No puedes ver las postulaciones de otra licitación");
        List<PostulacionDto> out = dtosPost(posts.findByLicitacionId(licitacionId), Map.of(l.getId(), l));
        return out.stream().sorted(Comparator.comparing((PostulacionDto p) -> !p.premium()).thenComparing(PostulacionDto::fecha)).toList();    // Premium primero
    }

    @Transactional
    public PostulacionDto postular(long pymeId, long licitacionId, String mensaje) {
        Licitacion l = lic(licitacionId);
        if (!es(l, "Abierta") || l.getFechaCierre().isBefore(LocalDate.now())) throw ApiException.conflicto("Esta licitación ya está cerrada");
        if (posts.findByLicitacionIdAndPymeId(licitacionId, pymeId).isPresent()) throw ApiException.conflicto("Ya postulaste a esta licitación");
        if (l.getMaxPostulantes() != null && posts.countByLicitacionId(licitacionId) >= l.getMaxPostulantes()) throw ApiException.conflicto("La licitación alcanzó el máximo de postulantes");

        JsonNode sus = interno.get(urlVentas + "/internal/suscripciones/" + pymeId, JsonNode.class);          // límite según plan (3 Estándar / 7 Premium)
        int limite = sus.path("plan").path("postulacionesMes").asInt(3); boolean premium = "Premium".equals(sus.path("plan").path("nombre").asText());
        if (usadasMes(pymeId) >= limite) throw new ApiException(org.springframework.http.HttpStatus.UNPROCESSABLE_ENTITY, "Alcanzaste el límite de " + limite + " postulaciones este mes" + (premium ? "" : ". Pasa a Premium para postular más."));

        Postulacion p = new Postulacion();
        p.setLicitacionId(licitacionId); p.setPymeId(pymeId); p.setMensaje(mensaje); p.setEstado(ep("Pendiente"));
        p = posts.save(p);

        // El chat NO se abre al postular: solo cuando el Licitador aprueba y la licitación queda adjudicada (ver decidir).
        Ctx c = new Ctx();
        interno.notificar(urlNotif, l.getLicitadorId(), "Postulación recibida", "Nueva postulación recibida", "Una Pyme postuló a tu licitación \"" + l.getTitulo() + "\".", true);
        return dto(p, l, c);
    }

    public List<PostulacionDto> misPostulaciones(long pymeId) {
        List<Postulacion> ps = posts.findByPymeIdOrderByFechaPostulacionDesc(pymeId);
        Map<Long, Licitacion> porId = lics.findAllById(ps.stream().map(Postulacion::getLicitacionId).collect(Collectors.toSet())).stream().collect(Collectors.toMap(Licitacion::getId, x -> x));
        return dtosPost(ps, porId);
    }

    @Transactional
    public PostulacionDto decidir(long postulacionId, long licitadorId, String estado) {
        if (!"Aprobada".equals(estado) && !"Rechazada".equals(estado)) throw ApiException.invalido("Estado inválido");
        Postulacion p = post(postulacionId); Licitacion l = lic(p.getLicitacionId());
        if (l.getLicitadorId() != licitadorId) throw ApiException.prohibido("Solo el Licitador dueño puede decidir");
        if (!es(p, "Pendiente")) throw ApiException.conflicto("Esta postulación ya fue revisada");
        boolean aprobar = "Aprobada".equals(estado);
        if (aprobar && !es(l, "Abierta")) throw ApiException.conflicto("La licitación ya no está abierta");
        p.setEstado(ep(estado));
        if (aprobar) {                                          // ER: al aprobar una, la licitación pasa a 'Adjudicada'
            l.setEstado(el("Adjudicada"));
            for (Postulacion o : posts.findByLicitacionId(l.getId())) if (!o.getId().equals(p.getId()) && es(o, "Pendiente")) o.setEstado(ep("Rechazada"));
        }
        interno.notificar(urlNotif, p.getPymeId(), "Postulación " + estado.toLowerCase(), "Tu postulación fue " + (aprobar ? "aprobada" : "no seleccionada"),
                aprobar ? "El Licitador aprobó tu postulación a \"" + l.getTitulo() + "\" y la licitación te fue adjudicada. Ya puedes conversar por chat." : "Tu postulación a \"" + l.getTitulo() + "\" no fue seleccionada.", true);
        Ctx c = new Ctx();
        if (aprobar) abrirChat(p, l, c); else c.cargarConversaciones(List.of(p.getId()));
        return dto(p, l, c);
    }

    /** Abre la conversación Licitador–Pyme adjudicada (MS-Chat la crea una sola vez: postulacion_id es único). */
    private void abrirChat(Postulacion p, Licitacion l, Ctx c) {
        try {
            Map<String, Object> conv = Map.of("postulacionId", p.getId(), "licitadorId", l.getLicitadorId(), "pymeId", p.getPymeId());
            c.conversaciones.put(p.getId(), interno.post(urlChat + "/internal/conversaciones", conv, JsonNode.class).path("id").asLong());
        } catch (Exception e) { /* chat caído: la adjudicación igual queda; "adjudicar" vuelve a intentarlo */ }
    }

    /** Se mantiene por compatibilidad con el front: en el ER aprobar ya adjudica, así que solo confirma el estado. */
    @Transactional
    public PostulacionDto adjudicar(long postulacionId, long licitadorId) {
        Postulacion p = post(postulacionId); Licitacion l = lic(p.getLicitacionId());
        if (l.getLicitadorId() != licitadorId) throw ApiException.prohibido("Solo el Licitador dueño puede adjudicar");
        if (es(p, "Pendiente")) return decidir(postulacionId, licitadorId, "Aprobada");
        if (!es(p, "Aprobada")) throw ApiException.conflicto("Solo se puede adjudicar una postulación aprobada");
        Ctx c = new Ctx(); abrirChat(p, l, c);   // idempotente: si el chat estaba caído al aprobar, aquí se abre
        return dto(p, l, c);
    }

    // ---------- paneles ----------
    public ResumenLicitador resumenLicitador(long licitadorId) {
        List<Licitacion> mias = lics.findByLicitadorIdOrderByCreatedAtDesc(licitadorId);
        List<Postulacion> recibidas = mias.stream().flatMap(l -> posts.findByLicitacionId(l.getId()).stream()).toList();
        return new ResumenLicitador(mias.size(), mias.stream().filter(l -> "Abierta".equals(estadoEfectivo(l))).count(), mias.stream().filter(l -> es(l, "Adjudicada")).count(),
                recibidas.size(), recibidas.stream().filter(p -> es(p, "Pendiente")).count(), porMes(recibidas.stream().map(Postulacion::getFechaPostulacion).toList()),
                dtos(mias.stream().limit(3).toList()));
    }

    public ResumenPyme resumenPyme(long pymeId) {
        List<Postulacion> mias = posts.findByPymeIdOrderByFechaPostulacionDesc(pymeId);
        JsonNode sus = interno.get(urlVentas + "/internal/suscripciones/" + pymeId, JsonNode.class);
        Integer rubro = null; try { JsonNode u = interno.get(urlUsuarios + "/internal/usuarios/" + pymeId + "/resumen", JsonNode.class); if (u.hasNonNull("rubroId")) rubro = u.get("rubroId").asInt(); } catch (Exception ignorada) { }
        Set<Long> yaPostule = mias.stream().map(Postulacion::getLicitacionId).collect(Collectors.toSet());
        final Integer rb = rubro;
        List<Licitacion> rec = lics.buscar("", null, null, null).stream().filter(l -> "Abierta".equals(estadoEfectivo(l)) && !yaPostule.contains(l.getId()))
                .sorted(Comparator.comparing((Licitacion l) -> !Objects.equals(l.getRubroId(), rb)).thenComparing(Licitacion::getFechaCierre)).limit(4).toList();
        Map<Long, Licitacion> porId = lics.findAllById(yaPostule).stream().collect(Collectors.toMap(Licitacion::getId, x -> x));
        long adjudicadas = mias.stream().filter(p -> es(p, "Aprobada") && es(porId.get(p.getLicitacionId()), "Adjudicada")).count();
        return new ResumenPyme(mias.size(), count(mias, "Pendiente"), count(mias, "Aprobada"), count(mias, "Rechazada"), adjudicadas, usadasMes(pymeId),
                sus.path("plan").path("postulacionesMes").asLong(3), sus.path("plan").path("nombre").asText("Estándar"), porMes(mias.stream().map(Postulacion::getFechaPostulacion).toList()), dtos(rec));
    }

    // ---------- interno ----------
    public long usadasMes(long pymeId) { return posts.countByPymeIdAndFechaPostulacionGreaterThanEqual(pymeId, YearMonth.now().atDay(1)); }

    public Map<String, Object> resumenGlobal() {
        List<Licitacion> todas = lics.findAll();
        Map<String, Long> rubros = todas.stream().collect(Collectors.groupingBy(l -> String.valueOf(l.getRubroId()), Collectors.counting()));
        return Map.of("total", todas.size(), "abiertas", todas.stream().filter(l -> "Abierta".equals(estadoEfectivo(l))).count(), "adjudicadas", todas.stream().filter(l -> es(l, "Adjudicada")).count(),
                "postulaciones", posts.count(), "porRubro", rubros);
    }

    /** Para MS-Chat: título de la licitación de cada postulación. */
    public List<Map<String, Object>> resumenPostulaciones(List<Long> ids) {
        List<Map<String, Object>> out = new ArrayList<>();
        for (Postulacion p : posts.findAllById(ids)) {
            Licitacion l = lic(p.getLicitacionId());
            boolean adjudicada = es(p, "Aprobada") && es(l, "Adjudicada");   // MS-Chat solo habilita el chat en este caso
            out.add(Map.of("id", p.getId(), "licitacionId", l.getId(), "licitacionTitulo", l.getTitulo(), "adjudicada", adjudicada));
        }
        return out;
    }

    @Transactional
    public void eliminarUsuario(long id) {
        for (Licitacion l : lics.findByLicitadorIdOrderByCreatedAtDesc(id)) posts.deleteByLicitacionId(l.getId());
        lics.deleteByLicitadorId(id); posts.deleteByPymeId(id);
    }

    // ---------- utilidades ----------
    private static String blank(String s) { return s == null || s.isBlank() ? "" : s.trim(); }
    private static long count(List<Postulacion> l, String estado) { return l.stream().filter(p -> es(p, estado)).count(); }
    private static List<PuntoMensual> porMes(List<LocalDate> fechas) {
        List<PuntoMensual> out = new ArrayList<>(); YearMonth ahora = YearMonth.now();
        for (int i = 5; i >= 0; i--) { YearMonth ym = ahora.minusMonths(i); out.add(new PuntoMensual(MESES[ym.getMonthValue() - 1], fechas.stream().filter(f -> YearMonth.from(f).equals(ym)).count())); }
        return out;
    }
}
