// About page toys: things rise in as you scroll, the ultra distance slider, a port scan that
// finds nothing, records that spin, and the time in Granada next to the visitor's own.
const reduce = () => window.matchMedia('(prefers-reduced-motion: reduce)').matches;

function reveals(root: HTMLElement) {
  const els = Array.from(root.querySelectorAll<HTMLElement>('[data-reveal]'));
  if (reduce() || !('IntersectionObserver' in window)) {
    els.forEach((el) => el.classList.add('is-in'));
    return;
  }
  const io = new IntersectionObserver(
    (entries) =>
      entries.forEach((e) => {
        if (!e.isIntersecting) return;
        e.target.classList.add('is-in');
        io.unobserve(e.target);
      }),
    { threshold: 0.15 }
  );
  els.forEach((el) => io.observe(el));
}

function ultra(root: HTMLElement) {
  const box = root.querySelector<HTMLElement>('[data-ultra]');
  if (!box) return;
  const range = box.querySelector<HTMLInputElement>('[data-range]')!;
  const fill = box.querySelector<HTMLElement>('[data-fill]')!;
  const runner = box.querySelector<HTMLElement>('[data-runner]')!;
  const dist = box.querySelector<HTMLElement>('[data-dist]')!;
  const zone = box.querySelector<HTMLElement>('[data-zone]')!;
  const units = Array.from(box.querySelectorAll<HTMLButtonElement>('[data-unit]'));
  let unit = 'km';
  const render = () => {
    const km = Number(range.value);
    const pct = `${km}%`;
    fill.style.width = pct;
    runner.style.left = pct;
    const value = unit === 'km' ? km : km * 0.621371;
    dist.textContent = `${value.toFixed(value < 10 ? 1 : 0)} ${unit}`;
    const isUltra = km > 42.195;
    zone.textContent = isUltra ? zone.dataset.ultraLabel || '' : zone.dataset.road || '';
    box.classList.toggle('is-ultra', isUltra);
  };
  range.addEventListener('input', render);
  units.forEach((b) =>
    b.addEventListener('click', () => {
      unit = b.dataset.unit || 'km';
      units.forEach((u) => u.setAttribute('aria-pressed', String(u === b)));
      render();
    })
  );
  render();
}

function ports(root: HTMLElement) {
  const box = root.querySelector<HTMLElement>('[data-ports]');
  if (!box) return;
  const btn = box.querySelector<HTMLButtonElement>('[data-scan]')!;
  const out = box.querySelector<HTMLElement>('[data-out]')!;
  const bar = box.querySelector<HTMLElement>('[data-bar]')!;
  const label = btn.textContent;
  const total = 65535;
  const fmt = (n: number) => n.toLocaleString(document.documentElement.lang);
  btn.addEventListener('click', () => {
    btn.disabled = true;
    box.classList.remove('is-done');
    const t0 = performance.now();
    const ms = reduce() ? 0 : 1600;
    const step = (now: number) => {
      const k = ms ? Math.min(1, (now - t0) / ms) : 1;
      bar.style.width = `${k * 100}%`;
      out.textContent = `${out.dataset.scanning} ${fmt(Math.round(k * total))}`;
      if (k < 1) return requestAnimationFrame(step);
      out.textContent = (out.dataset.result || '').replace('{n}', fmt(total));
      box.classList.add('is-done');
      btn.disabled = false;
      btn.textContent = btn.dataset.again || label;
    };
    requestAnimationFrame(step);
  });
}

function records(root: HTMLElement) {
  root.querySelectorAll<HTMLButtonElement>('[data-record]').forEach((b) =>
    b.addEventListener('click', () => {
      const on = !b.classList.contains('is-playing');
      root
        .querySelectorAll('[data-record].is-playing')
        .forEach((r) => r.classList.remove('is-playing'));
      b.classList.toggle('is-playing', on);
      b.setAttribute('aria-pressed', String(on));
    })
  );
}

function clock(root: HTMLElement) {
  const el = root.querySelector<HTMLElement>('[data-clock]');
  if (!el) return;
  const lang = document.documentElement.lang === 'es' ? 'es-ES' : 'en-GB';
  const opts: Intl.DateTimeFormatOptions = { hour: '2-digit', minute: '2-digit' };
  const render = () => {
    const now = new Date();
    const g = new Intl.DateTimeFormat(lang, { ...opts, timeZone: 'Europe/Madrid' }).format(now);
    const l = new Intl.DateTimeFormat(lang, opts).format(now);
    const tpl = g === l ? el.dataset.same : el.dataset.diff;
    el.textContent = (tpl || '').replace('{g}', g).replace('{l}', l);
  };
  render();
  window.setInterval(render, 30000);
}

export function mountAboutToys(root: HTMLElement | null) {
  if (!root) return;
  reveals(root);
  ultra(root);
  ports(root);
  records(root);
  clock(root);
}
