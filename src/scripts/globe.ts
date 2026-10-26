// A small drag-to-spin globe for the About page: Natural Earth land, two pins and the arc
// between them. Pure SVG + d3-geo, no canvas, and it rests when nobody is looking.
import { geoOrthographic, geoPath, geoGraticule10, geoDistance } from 'd3-geo';
import { feature } from 'topojson-client';
import land110 from 'world-atlas/land-110m.json';

type Pin = { name: string; lon: number; lat: number };
const NS = 'http://www.w3.org/2000/svg';

export function mountGlobe(host: HTMLElement, pins: Pin[]) {
  const size = 480;
  const svg = document.createElementNS(NS, 'svg');
  svg.setAttribute('viewBox', `0 0 ${size} ${size}`);
  svg.setAttribute('role', 'img');
  svg.setAttribute('aria-label', host.dataset.label || '');
  host.prepend(svg);
  const el = (tag: string, cls: string, parent: Element = svg) => {
    const node = document.createElementNS(NS, tag);
    node.setAttribute('class', cls);
    parent.appendChild(node);
    return node;
  };
  const r = size / 2 - 4;
  const proj = geoOrthographic()
    .scale(r)
    .translate([size / 2, size / 2])
    .clipAngle(90)
    .rotate([-8, -38]);
  const path = geoPath(proj);
  const topo = land110 as any;
  const landGeo = feature(topo, topo.objects.land) as any;
  const sea = el('circle', 'globe-sea');
  sea.setAttribute('cx', String(size / 2));
  sea.setAttribute('cy', String(size / 2));
  sea.setAttribute('r', String(r));
  const grat = el('path', 'globe-grat');
  const land = el('path', 'globe-land');
  const arc = el('path', 'globe-arc');
  const pinEls = pins.map((p) => {
    const g = el('g', 'globe-pin');
    const pulse = el('circle', 'globe-pulse', g);
    pulse.setAttribute('r', '6');
    const dot = el('circle', 'globe-dot', g);
    dot.setAttribute('r', '6');
    const label = el('text', 'globe-label', g);
    label.setAttribute('x', '12');
    label.setAttribute('y', '4');
    label.textContent = p.name;
    return { p, g };
  });
  const rim = el('circle', 'globe-rim');
  rim.setAttribute('cx', String(size / 2));
  rim.setAttribute('cy', String(size / 2));
  rim.setAttribute('r', String(r));
  const arcGeo = {
    type: 'LineString',
    coordinates: pins.map((p) => [p.lon, p.lat]),
  } as any;

  const draw = () => {
    grat.setAttribute('d', path(geoGraticule10()) || '');
    land.setAttribute('d', path(landGeo) || '');
    arc.setAttribute('d', path(arcGeo) || '');
    const [lam, phi] = proj.rotate();
    pinEls.forEach(({ p, g }) => {
      const xy = proj([p.lon, p.lat]);
      const visible = geoDistance([p.lon, p.lat], [-lam, -phi]) < Math.PI / 2 - 0.05;
      if (xy) g.setAttribute('transform', `translate(${xy[0]},${xy[1]})`);
      g.style.opacity = visible ? '1' : '0';
    });
  };
  draw();

  const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  let velocity = reduce ? 0 : 0.12;
  let dragging = false;
  let last: [number, number] | null = null;
  let onScreen = true;
  let raf = 0;
  const tick = () => {
    raf = 0;
    if (!onScreen) return;
    if (!dragging && Math.abs(velocity) > 0.001) {
      const [lam, phi] = proj.rotate();
      proj.rotate([lam + velocity, phi]);
      // Ease a flick back down to the idle drift.
      const idle = reduce ? 0 : 0.12;
      velocity += (idle - velocity) * 0.02;
      draw();
    }
    raf = requestAnimationFrame(tick);
  };
  const start = () => {
    if (!raf) raf = requestAnimationFrame(tick);
  };
  svg.addEventListener('pointerdown', (e) => {
    dragging = true;
    last = [e.clientX, e.clientY];
    svg.setPointerCapture(e.pointerId);
    host.classList.add('is-dragging');
  });
  svg.addEventListener('pointermove', (e) => {
    if (!dragging || !last) return;
    const k = size / svg.getBoundingClientRect().width;
    const dx = (e.clientX - last[0]) * k * 0.35;
    const dy = (e.clientY - last[1]) * k * 0.35;
    const [lam, phi] = proj.rotate();
    proj.rotate([lam + dx, Math.max(-75, Math.min(75, phi - dy))]);
    velocity = dx;
    last = [e.clientX, e.clientY];
    draw();
  });
  const stop = () => {
    dragging = false;
    last = null;
    host.classList.remove('is-dragging');
  };
  svg.addEventListener('pointerup', stop);
  svg.addEventListener('pointercancel', stop);
  if ('IntersectionObserver' in window) {
    new IntersectionObserver(([entry]) => {
      onScreen = entry.isIntersecting;
      if (onScreen) start();
    }).observe(host);
  }
  start();
}
