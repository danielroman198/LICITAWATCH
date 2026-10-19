#!/usr/bin/env python3
"""Genera docs/Modelo_ER_LicitaWatch_implementado.pdf a partir de db/*.sql.

Crea bases temporales (lw_er_*) con cada script, lee su estructura real desde PostgreSQL
(tablas, columnas, tipos, PK, FK, UNIQUE, defaults) y arma un HTML que Chrome imprime a PDF (A3 horizontal):
  1. Mapa de referencias entre bases (columnas REF, sin llave foránea).
  2. Un diagrama por base con sus llaves foráneas.
  3. Diccionario de datos (el «Detalle» sale de los comentarios -- de cada columna en db/*.sql).

Uso (desde la raíz del repo):  python3 docs/er/generar_er.py
Requisitos: psql en el PATH, PostgreSQL local (DB_USER/DB_PASS, por defecto postgres/postgres) y Google Chrome o Chromium.
"""
import html, json, os, re, shutil, subprocess, sys, tempfile
from pathlib import Path

RAIZ = Path(__file__).resolve().parents[2]
SALIDA = RAIZ / 'docs' / 'Modelo_ER_LicitaWatch_implementado.pdf'
PG = ['psql', '-X', '-q', '-v', 'ON_ERROR_STOP=1', '-h', os.environ.get('DB_HOST', 'localhost'), '-U', os.environ.get('DB_USER', 'postgres')]
ENV = {**os.environ, 'PGPASSWORD': os.environ.get('DB_PASS', 'postgres')}

BASES = [  # (nombre corto, script, microservicio, color del grupo en el mapa)
    ('usuarios', '01_usuarios.sql', 'ms-usuarios (8081)', '#e8f0fb'),
    ('licitaciones', '02_licitaciones.sql', 'ms-licitaciones (8082)', '#e6f2e8'),
    ('ventas', '03_ventas.sql', 'ms-ventas (8083)', '#fbf5e1'),
    ('chat', '04_chat.sql', 'ms-chat (8085)', '#fbe7e6'),
    ('notificaciones', '05_notificaciones.sql', 'ms-notificaciones (8084)', '#f3e8fb'),
]
# Columnas que guardan el id de otra base (REF, sin FK; se validan por REST): (base, tabla, columna) -> (base destino, tabla destino)
REFS = {
    ('licitaciones', 'licitacion', 'licitador_id'): ('usuarios', 'licitador'),
    ('licitaciones', 'licitacion', 'rubro_id'): ('usuarios', 'rubro'),
    ('licitaciones', 'licitacion', 'region_id'): ('usuarios', 'region'),
    ('licitaciones', 'postulacion', 'pyme_id'): ('usuarios', 'pyme'),
    ('ventas', 'suscripcion', 'usuario_id'): ('usuarios', 'usuario'),
    ('chat', 'conversacion', 'postulacion_id'): ('licitaciones', 'postulacion'),
    ('chat', 'conversacion', 'licitador_id'): ('usuarios', 'licitador'),
    ('chat', 'conversacion', 'pyme_id'): ('usuarios', 'pyme'),
    ('chat', 'mensaje', 'emisor_id'): ('usuarios', 'usuario'),
    ('notificaciones', 'notificacion', 'usuario_id'): ('usuarios', 'usuario'),
}

META_SQL = r"""
SELECT json_build_object(
 'tablas', (SELECT json_agg(c.relname ORDER BY c.oid) FROM pg_class c JOIN pg_namespace n ON n.oid = c.relnamespace
            WHERE n.nspname = 'public' AND c.relkind = 'r'),
 'cols', (SELECT json_agg(json_build_object('t', c.relname, 'c', a.attname, 'tipo', format_type(a.atttypid, a.atttypmod),
                 'nn', a.attnotnull, 'def', pg_get_expr(d.adbin, d.adrelid)) ORDER BY c.oid, a.attnum)
          FROM pg_attribute a JOIN pg_class c ON c.oid = a.attrelid JOIN pg_namespace n ON n.oid = c.relnamespace
          LEFT JOIN pg_attrdef d ON d.adrelid = a.attrelid AND d.adnum = a.attnum
          WHERE n.nspname = 'public' AND c.relkind = 'r' AND a.attnum > 0 AND NOT a.attisdropped),
 'cons', (SELECT json_agg(json_build_object('t', c.relname, 'tipo', k.contype, 'ref', r.relname,
                 'cols', (SELECT json_agg(a.attname ORDER BY array_position(k.conkey, a.attnum)) FROM pg_attribute a
                          WHERE a.attrelid = k.conrelid AND a.attnum = ANY (k.conkey))))
          FROM pg_constraint k JOIN pg_class c ON c.oid = k.conrelid JOIN pg_namespace n ON n.oid = c.relnamespace
          LEFT JOIN pg_class r ON r.oid = k.confrelid
          WHERE n.nspname = 'public' AND k.contype IN ('p', 'u', 'f'))
);"""


def psql(db, *args, entrada=None):
    return subprocess.run(PG + ['-d', db, *args], env=ENV, input=entrada, text=True, capture_output=True, check=True).stdout


def leer_base(nombre, script):
    tmp = f'lw_er_{nombre}'
    psql('postgres', '-c', f'DROP DATABASE IF EXISTS {tmp}')
    psql('postgres', '-c', f"CREATE DATABASE {tmp} ENCODING 'UTF8'")
    try:
        psql(tmp, '-f', str(RAIZ / 'db' / script))
        meta = json.loads(psql(tmp, '-tA', '-c', META_SQL))
    finally:
        psql('postgres', '-c', f'DROP DATABASE IF EXISTS {tmp}')
    return meta


def comentarios(script):
    """Comentario -- al final de cada columna dentro de CREATE TABLE: {(tabla, columna): texto}."""
    out, tabla = {}, None
    for linea in (RAIZ / 'db' / script).read_text(encoding='utf-8').splitlines():
        m = re.match(r'\s*CREATE TABLE (?:IF NOT EXISTS )?(\w+)', linea, re.I)
        if m: tabla = m.group(1); continue
        if tabla and re.match(r'\s*\);', linea): tabla = None; continue
        m = re.match(r'\s+(\w+)\s+[A-Za-z].*?--\s*(.+)$', linea)
        if tabla and m and m.group(1).upper() not in ('CONSTRAINT', 'PRIMARY', 'UNIQUE', 'FOREIGN'):
            out[(tabla, m.group(1))] = m.group(2).strip()
    return out


def tipo_sql(c):
    t, d = c['tipo'], c['def'] or ''
    if d.startswith('nextval('): return {'bigint': 'BIGSERIAL', 'integer': 'SERIAL'}.get(t, t.upper())
    t = t.replace('character varying', 'VARCHAR').replace('timestamp with time zone', 'TIMESTAMPTZ')
    return t.upper()


def default_txt(c):
    d = c['def']
    if not d or d.startswith('nextval('): return ''
    d = re.sub(r'::[\w ]+', '', d)
    return {'true': 'TRUE', 'false': 'FALSE'}.get(d, d)


def modelo():
    bases = []
    for nombre, script, ms, color in BASES:
        meta, com = leer_base(nombre, script), comentarios(script)
        tablas = {t: {'nombre': t, 'cols': [], 'pk': [], 'fk': {}, 'uq': []} for t in meta['tablas']}
        for c in meta['cols']: tablas[c['t']]['cols'].append(c)
        for k in meta['cons'] or []:
            t = tablas[k['t']]
            if k['tipo'] == 'p': t['pk'] = k['cols']
            elif k['tipo'] == 'u': t['uq'].append(k['cols'])
            elif k['tipo'] == 'f': t['fk'][k['cols'][0]] = k['ref']
        for t in tablas.values():
            uq1 = {u[0] for u in t['uq'] if len(u) == 1}
            for c in t['cols']:
                c['sql'] = tipo_sql(c)
                c['uq'] = c['c'] in uq1
                c['ref'] = REFS.get((nombre, t['nombre'], c['c']))
                c['clave'] = 'PK' if c['c'] in t['pk'] else 'FK' if c['c'] in t['fk'] else 'REF' if c['ref'] else ''
                partes = [com.get((t['nombre'], c['c']), '')]
                if c['ref'] and 'REF' not in partes[0]: partes.append(f"REF {c['ref'][1]} ({c['ref'][0].capitalize()})")
                if default_txt(c): partes.append('· default ' + default_txt(c))
                c['detalle'] = ' '.join(p for p in partes if p)
            t['uq_multi'] = [u for u in t['uq'] if len(u) > 1]
        bases.append({'nombre': nombre, 'ms': ms, 'color': color, 'tablas': list(tablas.values())})
    return bases


# ---------------------------------------------------------------- HTML
E = html.escape
CSS = """
@page { size: A3 landscape; margin: 0 }
* { box-sizing: border-box } body { margin: 0; font-family: Arial, Helvetica, sans-serif; color: #111 }
.pag { position: relative; width: 1587px; height: 1122px; padding: 56px 60px; overflow: hidden; page-break-after: always }
h1 { margin: 0; color: #1f4e79; font-size: 22px } h2 { margin: 0; color: #1f4e79; font-size: 23px }
.sub { color: #555; font-size: 10.5px; margin-top: 6px } h3 { color: #1f4e79; font-size: 16px; margin: 14px 0 0; padding-bottom: 6px; border-bottom: 2px solid #1f4e79 }
.lienzo { position: absolute; left: 60px; top: 112px; right: 60px; bottom: 40px }
.card { position: absolute; background: #fff; border: 1px solid #666; font-size: 12.5px; z-index: 2 }
.card .tit { background: #1f4e79; color: #fff; font-weight: bold; text-align: center; padding: 6px 8px }
.card table { border-collapse: collapse; width: 100% } .card td { padding: 3.5px 7px; white-space: nowrap } .card td.k { font-weight: bold; width: 34px }
.card td.ti { color: #555 } .card tr.pk td.n { font-weight: bold } .nuevo { background: #fff4c2 }
svg.lineas { position: absolute; inset: 0; width: 100%; height: 100%; z-index: 1; overflow: visible }
.nota { position: absolute; left: 60px; right: 60px; bottom: 22px; font-size: 11px; background: #f4f5f7; border-left: 4px solid #c0392b; padding: 8px 12px }
.dic { display: grid; grid-template-columns: 1fr 1fr; gap: 14px 16px; margin-top: 12px; align-items: start }
.dic h4 { margin: 0 0 5px; color: #1f4e79; font-size: 13px } .dic table { width: 100%; border-collapse: collapse; font-size: 10.5px }
.dic th { background: #1f4e79; color: #fff; text-align: left; padding: 4px 6px } .dic td { border: 1px solid #ccc; padding: 3px 6px; vertical-align: top }
.dic td.multi { font-style: italic } .dic tr.nuevo td { background: #fff4c2 }
"""

# Destacar lo agregado desde la versión anterior del ER (se ve en amarillo).
NUEVO = {('chat', 'conversacion', 'borrada_licitador_at'), ('chat', 'conversacion', 'borrada_pyme_at')}


def diagrama(base, i_pag):
    tablas = {t['nombre']: t for t in base['tablas']}
    # Columna: las tablas a las que nadie apunta van a la izquierda y cada tabla referenciada queda una columna
    # a la derecha de quien la usa (así cada catálogo queda junto a su tabla y las líneas no cruzan otras tarjetas).
    entrantes = {t: [o for o in tablas if t in tablas[o]['fk'].values() and o != t] for t in tablas}
    memo = {}
    def col(t, vis=()):
        if t not in memo:
            memo[t] = 1 + max([col(o, vis + (t,)) for o in entrantes[t] if o not in vis] or [-1])
        return memo[t]
    columnas = [[] for _ in range(max(col(t) for t in tablas) + 1)]
    for t in tablas: columnas[col(t)].append(t)
    ancho = 1467 // max(len(columnas), 1)
    tarjetas = []
    for ci, col in enumerate(columnas):
        for t in col:
            filas = ''.join(
                f'<tr class="{"pk" if c["clave"] == "PK" else ""}{" nuevo" if (base["nombre"], t, c["c"]) in NUEVO else ""}" data-col="{c["c"]}">'
                f'<td class="k">{c["clave"]}</td><td class="n">{E(c["c"])}</td><td class="ti">{E(c["sql"])}{" · UQ" if c["uq"] else ""}</td></tr>'
                for c in tablas[t]['cols'])
            tarjetas.append(f'<div class="card" data-t="{t}" data-c="{ci}" style="left:{ci * ancho + 20}px;width:{min(ancho - 110, 360)}px">'
                            f'<div class="tit">{t}</div><table>{filas}</table></div>')
    fks = [{'de': t, 'col': c, 'a': r, 'uno': any(u == [c] for u in tablas[t]['uq'])} for t in tablas for c, r in tablas[t]['fk'].items()]
    return (f'<section class="pag" id="p{i_pag}"><h2>BD {base["nombre"].upper()}</h2>'
            f'<div class="sub">licitawatch_{base["nombre"]} · {base["ms"]} · {len(tablas)} tablas · PK llave primaria · FK llave foránea · REF referencia a otro microservicio · UQ único</div>'
            f'<div class="lienzo"><svg class="lineas"></svg>{"".join(tarjetas)}</div>'
            f'<script>DIAG.push({{pag:"p{i_pag}",fks:{json.dumps(fks)}}})</script></section>')


def mapa(bases):
    # Posiciones fijas de los grupos (como en la versión anterior) y nodos con las tablas que participan en una REF.
    pos = {'chat': (10, 380), 'licitaciones': (470, 120), 'ventas': (470, 590), 'notificaciones': (470, 760), 'usuarios': (1040, 0)}
    nodos = {}
    for (b, t, _), (bd, td) in REFS.items():
        nodos.setdefault(b, []).append(t); nodos.setdefault(bd, []).append(td)
    if 'chat' in nodos: nodos['chat'].append('mensaje')
    grupos, coords = '', {}
    for base in bases:
        b = base['nombre']
        orden = [t['nombre'] for t in base['tablas'] if t['nombre'] in set(nodos.get(b, []))]
        if b == 'usuarios': orden = [x for x in ['pyme', 'licitador', 'region', 'rubro', 'usuario'] if x in orden]
        x, y = pos[b]; paso = 92 if b != 'usuarios' else 120; alto = 60 + paso * len(orden)
        ancho = 250 if b == 'usuarios' else 280
        grupos += (f'<div style="position:absolute;left:{x}px;top:{y}px;width:{ancho}px;height:{alto}px;background:{base["color"]};'
                   f'border:1.5px solid #888;border-radius:14px;text-align:center;font-weight:bold;font-size:18px;padding-top:8px">'
                   f'licitawatch_{b}<br>{base["ms"]}</div>')
        for i, t in enumerate(orden):
            cx, cy = x + ancho / 2, y + 95 + i * paso
            coords[(b, t)] = (cx, cy)
            grupos += (f'<div style="position:absolute;left:{cx - 60}px;top:{cy - 24}px;width:120px;height:48px;background:#edf2fa;border:1.5px solid #1f4e79;'
                       f'border-radius:14px;display:grid;place-items:center;font-size:14px;z-index:2">{t}</div>')
    flechas = ''
    # Si varias flechas salen de (o llegan a) un mismo nodo, se reparten a lo alto del nodo para que no se encimen.
    salen, llegan = {}, {}
    for k, v in REFS.items():
        salen.setdefault((k[0], k[1]), []).append(k); llegan.setdefault(v, []).append(k)
    def desfase(grupo, k):
        orden = sorted(grupo, key=lambda x: coords[REFS[x]][1] if x in REFS and grupo is salen.get((x[0], x[1])) else coords[(x[0], x[1])][1])
        return (orden.index(k) - (len(orden) - 1) / 2) * 11
    for k, (bd, td) in REFS.items():
        b, t, c = k
        (x1, y1), (x2, y2) = coords[(b, t)], coords[(bd, td)]
        x1 += 60; x2 -= 64
        y1 += desfase(salen[(b, t)], k); y2 += desfase(llegan[(bd, td)], k)
        cx = (x1 + x2) / 2
        # Etiqueta en el tramo final (t = 0.7): ahí las flechas ya van separadas hacia su destino.
        t = 0.7; lx = (1 - t) ** 3 * x1 + 3 * (1 - t) ** 2 * t * cx + 3 * (1 - t) * t * t * cx + t ** 3 * x2
        ly = (1 - t) ** 3 * y1 + 3 * (1 - t) ** 2 * t * y1 + 3 * (1 - t) * t * t * y2 + t ** 3 * y2
        flechas += (f'<path d="M{x1},{y1} C{cx},{y1} {cx},{y2} {x2},{y2}" fill="none" stroke="#c0392b" stroke-width="1.6" stroke-dasharray="7 4" marker-end="url(#fl)"/>'
                    f'<text x="{lx + 4}" y="{ly - 7}" font-size="12" fill="#222" paint-order="stroke" stroke="#fff" stroke-width="4">{c}</text>')
    svg = ('<svg class="lineas"><defs><marker id="fl" markerWidth="10" markerHeight="8" refX="9" refY="4" orient="auto">'
           f'<path d="M0,0 L10,4 L0,8 z" fill="#c0392b"/></marker></defs>{flechas}</svg>')
    return ('<section class="pag"><h1>LicitaWatch · Modelo Entidad-Relación implementado</h1>'
            '<div class="sub">5 bases de datos PostgreSQL (una por microservicio). LicitAsist (ms-asistente) no tiene base de datos: es externo (Groq). '
            'Generado desde db/*.sql con docs/er/generar_er.py. En amarillo: lo agregado en esta versión (conversacion.borrada_licitador_at y borrada_pyme_at: eliminar conversación solo para mí).</div>'
            '<h3>Mapa de referencias entre bases (REF, sin llave foránea, validadas por REST)</h3>'
            f'<div class="lienzo" style="top:150px">{svg}{grupos}</div>'
            '<div class="nota">Línea punteada roja = columna REF: guarda el id de otra base/microservicio, sin FK. Dentro de cada base las relaciones sí son '
            'llaves foráneas (diagramas siguientes). Leyenda: PK llave primaria · FK llave foránea · REF referencia a otro microservicio · UQ único.</div></section>')


def diccionario(bases):
    paginas, primera = [], True
    for base in bases:
        bloques = []
        for t in base['tablas']:
            filas = ''.join(
                f'<tr class="{"nuevo" if (base["nombre"], t["nombre"], c["c"]) in NUEVO else ""}"><td>{E(c["c"])}</td><td>{E(c["sql"])}</td>'
                f'<td>{E(" · ".join(x for x in [c["clave"] + (" → " + t["fk"][c["c"]] if c["c"] in t["fk"] else ""), "UQ" if c["uq"] else ""] if x))}</td>'
                f'<td>{"NO" if c["nn"] else "sí"}</td><td>{E(c["detalle"])}</td></tr>' for c in t['cols'])
            filas += ''.join(f'<tr><td class="multi" colspan="5">UNIQUE ({", ".join(u)})</td></tr>' for u in t['uq_multi'])
            bloques.append(f'<div><h4>{t["nombre"]}</h4><table><tr><th style="width:20%">Columna</th><th style="width:18%">Tipo</th>'
                           f'<th style="width:20%">Clave</th><th style="width:7%">Null</th><th>Detalle</th></tr>{filas}</table></div>')
        # Reparte las tablas en páginas: la grilla va de a 2, así que cada par ocupa el alto de la más larga.
        def alto(t):
            return 48 + sum(20 + (13 if len(c['detalle']) > 55 else 0) for c in t['cols']) + 20 * len(t['uq_multi']) + 14
        disponible = 1122 - 112 - 60 - (45 if primera and not paginas else 0)
        actual, usado = [], 0
        for i in range(0, len(bloques), 2):
            par = base['tablas'][i:i + 2]
            h = max(alto(t) for t in par)
            if actual and usado + h > disponible:
                paginas.append((base, actual)); actual, usado, disponible = [], 0, 1122 - 112 - 60
            actual += bloques[i:i + 2]; usado += h
        if actual: paginas.append((base, actual))
    out = ''
    for base, bls in paginas:
        titulo = ('<h2>Diccionario de datos</h2>' if primera else '') + f'<h3>BD {base["nombre"].upper()} (licitawatch_{base["nombre"]})</h3>'
        primera = False
        out += f'<section class="pag">{titulo}<div class="dic">{"".join(bls)}</div></section>'
    return out


JS = r"""
// Ordena las tarjetas en cada columna y dibuja las FK (pata de gallo = lado «muchos», barra = lado «uno»).
for (const d of DIAG) {
  const pag = document.getElementById(d.pag), lienzo = pag.querySelector('.lienzo'), svg = pag.querySelector('svg');
  const cols = {};
  pag.querySelectorAll('.card').forEach(c => (cols[c.dataset.c] ??= []).push(c));
  const centro = el => { const r = el.getBoundingClientRect(); return r.top + r.height / 2; };
  for (const k of Object.keys(cols).sort((a, b) => a - b)) {
    let lista = cols[k];
    // Ordena cada columna según la altura media de las filas que la referencian (columnas ya ubicadas a la izquierda).
    if (k > 0) {
      const peso = c => { const ys = d.fks.filter(f => f.a === c.dataset.t && pag.querySelector(`.card[data-t="${f.de}"]`).dataset.c < k)
          .map(f => centro(pag.querySelector(`.card[data-t="${f.de}"] tr[data-col="${f.col}"]`)));
        return ys.length ? ys.reduce((s, y) => s + y, 0) / ys.length : 1e9; };
      const pesos = new Map(lista.map(c => [c, peso(c)]));
      lista = cols[k] = lista.sort((a, b) => pesos.get(a) - pesos.get(b));
    }
    const total = lista.reduce((s, c) => s + c.offsetHeight, 0), libre = lienzo.clientHeight - total;
    const gap = Math.max(18, Math.min(70, libre / (lista.length + 1)));
    let y = Math.max(0, (libre - gap * (lista.length - 1)) / 2);
    for (const c of lista) { c.style.top = y + 'px'; y += c.offsetHeight + gap; }
  }
  const caja = lienzo.getBoundingClientRect(), NS = 'http://www.w3.org/2000/svg';
  const linea = (dd, w) => { const p = document.createElementNS(NS, 'path'); p.setAttribute('d', dd); p.setAttribute('fill', 'none');
    p.setAttribute('stroke', '#1f4e79'); p.setAttribute('stroke-width', w || 1.6); svg.appendChild(p); };
  for (const f of d.fks) {
    const fila = pag.querySelector(`.card[data-t="${f.de}"] tr[data-col="${f.col}"]`).getBoundingClientRect();
    const dest = pag.querySelector(`.card[data-t="${f.a}"] tr.pk`).getBoundingClientRect();
    const x1 = fila.right - caja.left, y1 = fila.top + fila.height / 2 - caja.top;
    const x2 = dest.left - caja.left, y2 = dest.top + dest.height / 2 - caja.top, m = (x1 + x2) / 2;
    linea(`M${x1},${y1} C${m},${y1} ${m},${y2} ${x2},${y2}`);
    linea(`M${x2 - 10},${y2 - 7} L${x2 - 10},${y2 + 7}`, 2);            // «uno» en la PK
    if (f.uno) linea(`M${x1 + 10},${y1 - 7} L${x1 + 10},${y1 + 7}`, 2);  // FK única: 1 a 1
    else linea(`M${x1 + 12},${y1} L${x1},${y1 - 7} M${x1 + 12},${y1} L${x1},${y1 + 7}`, 1.6); // «muchos»
  }
}
"""


def main():
    bases = modelo()
    cuerpo = mapa(bases) + ''.join(diagrama(b, i) for i, b in enumerate(bases)) + diccionario(bases)
    doc = (f'<!doctype html><html lang="es"><head><meta charset="utf-8"><title>Modelo ER LicitaWatch</title><style>{CSS}</style>'
           f'<script>const DIAG = []</script></head><body>{cuerpo}<script>{JS}</script></body></html>')
    chrome = next((c for c in ['google-chrome', 'chromium', 'chromium-browser'] if shutil.which(c)), None)
    if not chrome: sys.exit('No encontré Google Chrome ni Chromium para imprimir el PDF.')
    with tempfile.TemporaryDirectory() as tmp:
        f = Path(tmp) / 'er.html'
        f.write_text(doc, encoding='utf-8')
        if '--html' in sys.argv: shutil.copy(f, SALIDA.with_suffix('.html'))
        subprocess.run([chrome, '--headless=new', '--disable-gpu', '--no-pdf-header-footer', '--virtual-time-budget=3000',
                        f'--user-data-dir={tmp}/perfil', f'--print-to-pdf={SALIDA}', f.as_uri()], check=True, capture_output=True)
    print(f'Listo: {SALIDA.relative_to(RAIZ)}')


if __name__ == '__main__':
    main()
