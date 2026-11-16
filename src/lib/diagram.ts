// Build-time diagram renderer: a small grid spec in, themed inline SVG out.
// Colours and fonts come from CSS (src/styles/diagram.css), so one spec serves light and dark,
// both languages, and a wide and a narrow layout. Specs live in src/data/diagrams.ts.

export type Lang = 'en' | 'es';
type XY = [number, number];
type Route = 'auto' | 'hv' | 'vh' | 'under' | 'side';

export interface DiagramSpec {
  /** Node width in the wide layout. Four columns of 176 fill the article's figure width. */
  cell?: number;
  gap?: XY;
  /** Node width in the narrow layout. Default: whatever fits the columns into 336. */
  mcell?: number;
  nodes: {
    id: string;
    /** [column, row] in the wide layout. Fractions are allowed, e.g. 0.5 to sit between rows. */
    at: XY;
    /** [column, row] in the narrow layout. Default: one column, in declaration order. */
    m?: XY;
    span?: number;
    mspan?: number;
    tone?: 'accent' | 'soft' | 'ink';
  }[];
  edges: {
    from: string;
    to: string;
    /** Key into text.labels. */
    label?: string;
    route?: Route;
    mroute?: Route;
    dashed?: boolean;
    arrow?: boolean;
    /** Set false to drop the label in the narrow layout, where it would collide. */
    mlabel?: boolean;
  }[];
  groups?: { ids: string[]; label: string }[];
  text: Partial<
    Record<Lang, { nodes: Record<string, [string, string?]>; labels?: Record<string, string> }>
  >;
}

interface Box {
  x: number;
  y: number;
  w: number;
  h: number;
}

const esc = (s: string) =>
  s.replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]!);
const r1 = (n: number) => Math.round(n * 10) / 10;

// ponytail: wraps by average glyph width, not real metrics. Good to about +/-10% for Latin text;
// measure with a font file if a label ever overflows its node.
function wrap(s: string | undefined, width: number, glyph: number): string[] {
  if (!s) return [];
  const max = Math.max(8, Math.floor((width - 22) / glyph));
  const lines: string[] = [];
  let line = '';
  for (const word of s.split(' ')) {
    const next = line ? `${line} ${word}` : word;
    if (line && next.length > max) {
      lines.push(line);
      line = word;
    } else line = next;
  }
  if (line) lines.push(line);
  return lines;
}

/** Share of the smaller interval that the two intervals have in common, and where its centre is. */
function overlap(a0: number, a1: number, b0: number, b1: number) {
  const lo = Math.max(a0, b0);
  const hi = Math.min(a1, b1);
  return { ratio: (hi - lo) / Math.min(a1 - a0, b1 - b0), mid: (lo + hi) / 2 };
}

const TIP = 4; // gap between an arrow tip and the node it points at

function route(a: Box, b: Box, kind: Route, gy: number): XY[] {
  const ac: XY = [a.x + a.w / 2, a.y + a.h / 2];
  const bc: XY = [b.x + b.w / 2, b.y + b.h / 2];
  const right = bc[0] > ac[0];
  const down = bc[1] > ac[1];
  const ax = right ? a.x + a.w : a.x; // side of A that faces B horizontally
  const ay = down ? a.y + a.h : a.y;
  const bx = right ? b.x - TIP : b.x + b.w + TIP;
  const by = down ? b.y - TIP : b.y + b.h + TIP;

  if (kind === 'hv')
    return [
      [ax, ac[1]],
      [bc[0], ac[1]],
      [bc[0], by],
    ];
  if (kind === 'vh')
    return [
      [ac[0], ay],
      [ac[0], bc[1]],
      [bx, bc[1]],
    ];
  if (kind === 'under') {
    const y = Math.max(a.y + a.h, b.y + b.h) + gy * 0.6;
    return [
      [ac[0], a.y + a.h],
      [ac[0], y],
      [bc[0], y],
      [bc[0], b.y + b.h + TIP],
    ];
  }
  if (kind === 'side') {
    const x = Math.max(a.x + a.w, b.x + b.w) + 26;
    return [
      [a.x + a.w, ac[1]],
      [x, ac[1]],
      [x, bc[1]],
      [b.x + b.w + TIP, bc[1]],
    ];
  }

  const ox = overlap(a.x, a.x + a.w, b.x, b.x + b.w);
  const oy = overlap(a.y, a.y + a.h, b.y, b.y + b.h);
  if (oy.ratio >= 0.6)
    return [
      [ax, oy.mid],
      [bx, oy.mid],
    ];
  if (ox.ratio >= 0.6)
    return [
      [ox.mid, ay],
      [ox.mid, by],
    ];
  if (ox.ratio > 0) {
    const mid = (ay + by) / 2;
    return [
      [ac[0], ay],
      [ac[0], mid],
      [bc[0], mid],
      [bc[0], by],
    ];
  }
  const mid = (ax + bx) / 2;
  return [
    [ax, ac[1]],
    [mid, ac[1]],
    [mid, bc[1]],
    [bx, bc[1]],
  ];
}

const dist = (a: XY, b: XY) => Math.hypot(b[0] - a[0], b[1] - a[1]);
const toward = (from: XY, to: XY, d: number): XY => {
  const len = dist(from, to) || 1;
  return [from[0] + ((to[0] - from[0]) * d) / len, from[1] + ((to[1] - from[1]) * d) / len];
};
const pt = (p: XY) => `${r1(p[0])} ${r1(p[1])}`;

/** Polyline with rounded corners. */
function pathD(p: XY[]): string {
  let d = `M${pt(p[0])}`;
  for (let i = 1; i < p.length - 1; i++) {
    const r = Math.min(10, dist(p[i - 1], p[i]) / 2, dist(p[i], p[i + 1]) / 2);
    d += `L${pt(toward(p[i], p[i - 1], r))}Q${pt(p[i])} ${pt(toward(p[i], p[i + 1], r))}`;
  }
  return `${d}L${pt(p[p.length - 1])}`;
}

function layout(spec: DiagramSpec, lang: Lang, alt: string, narrow: boolean): string {
  const t = spec.text[lang];
  if (!t) throw new Error(`Diagram has no "${lang}" text`);
  const gx = narrow ? 32 : (spec.gap?.[0] ?? 64);
  const gy = narrow ? 44 : (spec.gap?.[1] ?? 56);
  const at = spec.nodes.map((n, i): XY => (narrow ? (n.m ?? [0, i]) : n.at));
  const span = spec.nodes.map((n) => (narrow ? n.mspan : n.span) ?? 1);
  const cols = Math.ceil(Math.max(...at.map(([c], i) => c + span[i])));
  const cw = narrow
    ? (spec.mcell ?? Math.floor((336 - (cols - 1) * gx) / cols))
    : (spec.cell ?? 176);

  const texts = spec.nodes.map((n, i) => {
    const label = t.nodes[n.id];
    if (!label) throw new Error(`Diagram node "${n.id}" has no "${lang}" text`);
    const w = cw * span[i] + gx * (span[i] - 1);
    return { w, title: wrap(label[0], w, 8.4), sub: wrap(label[1], w, 6.2) };
  });
  const blockH = (x: (typeof texts)[number]) =>
    x.title.length * 20 + (x.sub.length ? 5 + x.sub.length * 17 : 0);
  const ch = Math.max(60, ...texts.map((x) => 26 + blockH(x)));
  const boxes = new Map<string, Box>(
    spec.nodes.map((n, i) => [
      n.id,
      { x: at[i][0] * (cw + gx), y: at[i][1] * (ch + gy), w: texts[i].w, h: ch },
    ])
  );
  const box = (id: string) => {
    const b = boxes.get(id);
    if (!b) throw new Error(`Diagram edge points at unknown node "${id}"`);
    return b;
  };

  // Everything drawn reports its extent here so the viewBox fits the content.
  let [x0, y0, x1, y1] = [Infinity, Infinity, -Infinity, -Infinity];
  const grow = (x: number, y: number) => {
    x0 = Math.min(x0, x);
    y0 = Math.min(y0, y);
    x1 = Math.max(x1, x);
    y1 = Math.max(y1, y);
  };
  for (const b of boxes.values()) {
    grow(b.x, b.y);
    grow(b.x + b.w, b.y + b.h);
  }

  const labels: string[] = [];
  const groups = (spec.groups ?? []).map((g) => {
    const bs = g.ids.map(box);
    const gx0 = Math.min(...bs.map((b) => b.x)) - 16;
    const gy0 = Math.min(...bs.map((b) => b.y)) - 34;
    const right = Math.max(...bs.map((b) => b.x + b.w)) + 16;
    const gy1 = Math.max(...bs.map((b) => b.y + b.h)) + 16;
    const text = t.labels?.[g.label] ?? g.label;
    const gx1 = Math.max(right, gx0 + 28 + text.length * 7);
    grow(gx0, gy0);
    grow(gx1, gy1);
    labels.push(
      `<text class="dg-label dg-group-label" x="${r1(gx0 + 14)}" y="${r1(gy0 + 17)}">${esc(text)}</text>`
    );
    return `<rect class="dg-group" x="${r1(gx0)}" y="${r1(gy0)}" width="${r1(gx1 - gx0)}" height="${r1(gy1 - gy0)}" rx="16"/>`;
  });

  const order = new Map(spec.nodes.map((n, i) => [n.id, i]));
  const edges = spec.edges.map((e) => {
    const kind =
      (narrow ? (e.mroute ?? (e.route === 'under' ? 'side' : e.route)) : e.route) ?? 'auto';
    const p = route(box(e.from), box(e.to), kind, gy);
    p.forEach(([x, y]) => grow(x, y));
    const end = p[p.length - 1];
    const prev = p[p.length - 2];
    let head = '';
    if (e.arrow !== false) {
      const back = toward(end, prev, 8);
      const nx = ((end[1] - prev[1]) / dist(prev, end)) * 4.5;
      const ny = ((prev[0] - end[0]) / dist(prev, end)) * 4.5;
      head = `<path class="dg-head" d="M${pt(end)}L${pt([back[0] + nx, back[1] + ny])}L${pt([back[0] - nx, back[1] - ny])}Z"/>`;
      p[p.length - 1] = toward(end, prev, 5);
    }
    if (e.label && !(narrow && e.mlabel === false)) {
      // Label sits on the longest segment: above a horizontal run, on top of a vertical one
      // (the CSS halo keeps the line from running through it).
      let best = 1;
      for (let i = 2; i < p.length; i++)
        if (dist(p[i - 1], p[i]) >= dist(p[best - 1], p[best])) best = i;
      const mx = (p[best - 1][0] + p[best][0]) / 2;
      const flat = p[best - 1][1] === p[best][1];
      const my = (p[best - 1][1] + p[best][1]) / 2 - (flat ? 10 : 0);
      const text = t.labels?.[e.label] ?? e.label;
      const turn = !flat && text.length > 10 ? ` transform="rotate(-90 ${r1(mx)} ${r1(my)})"` : '';
      labels.push(`<text class="dg-label" x="${r1(mx)}" y="${r1(my)}"${turn}>${esc(text)}</text>`);
    }
    const i = (order.get(e.to) ?? 0) - 0.5;
    return `<g class="dg-edge${e.dashed ? ' dg-dashed' : ''}" style="--i:${i}"><path class="dg-line" ${e.dashed ? '' : 'pathLength="1" '}d="${pathD(p)}"/>${head}</g>`;
  });

  const nodes = spec.nodes.map((n, i) => {
    const b = box(n.id);
    const cx = r1(b.x + b.w / 2);
    let y = b.y + (b.h - blockH(texts[i])) / 2 + 15;
    const tspans = (lines: string[], cls: string, step: number) =>
      lines
        .map((line) => {
          const s = `<tspan class="${cls}" x="${cx}" y="${r1(y)}">${esc(line)}</tspan>`;
          y += step;
          return s;
        })
        .join('');
    const title = tspans(texts[i].title, 'dg-title', 20);
    y += 2;
    const sub = tspans(texts[i].sub, 'dg-sub', 17);
    return (
      `<g class="dg-node${n.tone ? ` dg-${n.tone}` : ''}" style="--i:${i}">` +
      `<rect x="${r1(b.x)}" y="${r1(b.y)}" width="${r1(b.w)}" height="${r1(b.h)}" rx="12"/>` +
      `<text>${title}${sub}</text></g>`
    );
  });

  const pad = 14;
  const vb = [x0 - pad, y0 - pad, x1 - x0 + pad * 2, y1 - y0 + pad * 2].map(r1);
  return (
    `<svg class="${narrow ? 'dg-narrow' : 'dg-wide'}" viewBox="${vb.join(' ')}" width="${vb[2]}" height="${vb[3]}" role="img" aria-label="${esc(alt)}">` +
    groups.join('') +
    edges.join('') +
    nodes.join('') +
    labels.join('') +
    '</svg>'
  );
}

export function renderDiagram(spec: DiagramSpec, lang: Lang, alt: string): string {
  return `<div class="dg">${layout(spec, lang, alt, false)}${layout(spec, lang, alt, true)}</div>`;
}
