// About page toys: things rise in as you scroll, the ultra distance slider
// with personal bests, a 48-hour jam clock, a contest judge, an ASCII Advent tree, and the time in Granada.
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
  const pbs: [number, string][] = JSON.parse(zone.dataset.pbs || '[]');
  const render = () => {
    const km = Number(range.value);
    const pct = `${km}%`;
    fill.style.width = pct;
    runner.style.left = pct;
    const value = unit === 'km' ? km : km * 0.621371;
    dist.textContent = `${value.toFixed(value < 10 ? 1 : 0)} ${unit}`;
    const isUltra = km > 42.195;
    // Near one of the distances I've raced, show my best time instead.
    const pb = pbs.find(([d]) => Math.abs(d - km) <= 1);
    zone.textContent = pb
      ? (zone.dataset.pb || '{t}').replace('{t}', pb[1])
      : isUltra
        ? zone.dataset.ultraLabel || ''
        : zone.dataset.road || '';
    box.classList.toggle('is-pb', Boolean(pb));
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

function jam(root: HTMLElement) {
  const box = root.querySelector<HTMLElement>('[data-jam]');
  if (!box) return;
  const clock = box.querySelector<HTMLElement>('[data-jam-clock]')!;
  const btn = box.querySelector<HTMLButtonElement>('[data-jam-start]')!;
  const done = box.querySelector<HTMLElement>('[data-jam-done]')!;
  const awards = box.querySelector<HTMLElement>('[data-jam-awards]')!;
  const idle = box.querySelector<HTMLElement>('[data-jam-idle]');
  const total = 48 * 3600;
  const fmt = (sec: number) =>
    [Math.floor(sec / 3600), Math.floor((sec % 3600) / 60), sec % 60]
      .map((n) => String(n).padStart(2, '0'))
      .join(':');
  btn.addEventListener('click', () => {
    btn.disabled = true;
    done.hidden = true;
    awards.hidden = true;
    if (idle) idle.hidden = true;
    box.classList.add('is-running');
    const t0 = performance.now();
    const ms = reduce() ? 0 : 2200;
    const step = (now: number) => {
      const k = ms ? Math.min(1, (now - t0) / ms) : 1;
      // Ease out so the last hour crawls, like it does at a real jam.
      const eased = 1 - Math.pow(1 - k, 3);
      clock.textContent = fmt(Math.round(total * (1 - eased)));
      if (k < 1) return requestAnimationFrame(step);
      box.classList.remove('is-running');
      done.hidden = false;
      awards.hidden = false;
      btn.disabled = false;
      btn.textContent = btn.dataset.again || btn.textContent;
    };
    requestAnimationFrame(step);
  });
}

function judge(root: HTMLElement) {
  const box = root.querySelector<HTMLElement>('[data-cp]');
  if (!box) return;
  const btn = box.querySelector<HTMLButtonElement>('[data-submit]')!;
  const verdict = box.querySelector<HTMLElement>('[data-verdict]')!;
  const meta = box.querySelector<HTMLElement>('[data-verdict-meta]')!;
  const tests = Array.from(box.querySelectorAll<HTMLElement>('.ab-judge-tests i'));
  btn.addEventListener('click', () => {
    btn.disabled = true;
    box.classList.remove('is-accepted');
    tests.forEach((t) => t.classList.remove('is-pass'));
    verdict.textContent = '…';
    let i = 0;
    const next = () => {
      if (i < tests.length) {
        meta.textContent = (meta.dataset.running || '').replace('{n}', String(i + 1));
        tests[i].classList.add('is-pass');
        i += 1;
        window.setTimeout(next, reduce() ? 0 : 160 + Math.random() * 140);
        return;
      }
      verdict.textContent = meta.dataset.accepted || 'Accepted';
      meta.textContent = meta.dataset.meta || '';
      box.classList.add('is-accepted');
      btn.disabled = false;
      btn.textContent = btn.dataset.again || btn.textContent;
    };
    next();
  });
}

function tree(root: HTMLElement) {
  const pre = root.querySelector<HTMLElement>('[data-tree]');
  if (!pre) return;
  // An ASCII tree in the spirit of the Advent of Code calendar: ornaments twinkle,
  // and the star on top is gold.
  const body = ['*', '>o<', '>@>o<', '>>*<o<<', '>o>>@<<*<', '>>*<o>>@<<<', '>o>>*<@<<o>><'];
  const width = 13;
  const center = (row: string) => {
    const pad = Math.floor((width - row.length) / 2);
    return ' '.repeat(pad) + row + ' '.repeat(width - row.length - pad);
  };
  const rows = [...body.map(center), center('|_|')];
  const ornaments = new Set(['o', '@', '*']);
  const wrap = (ch: string, r: number, c: number) => {
    if (r === 0 && ch === '*') return '<b class="t-star">*</b>';
    if (ch === '|' || ch === '_') return `<span class="t-trunk">${ch}</span>`;
    if (ornaments.has(ch))
      return `<span class="t-orn" style="--i:${(r * 7 + c * 3) % 10}">${ch}</span>`;
    if (ch === '<' || ch === '>') return `<span class="t-leaf">${ch}</span>`;
    return ch;
  };
  pre.innerHTML = rows
    .map((row, r) =>
      Array.from(row)
        .map((ch, c) => wrap(ch, r, c))
        .join('')
    )
    .join('\n');
}

function words(root: HTMLElement) {
  const els = Array.from(root.querySelectorAll<HTMLElement>('[data-word]'));
  if (els.length < 2 || reduce()) return;
  let i = 0;
  window.setInterval(() => {
    els[i].classList.remove('is-on');
    i = (i + 1) % els.length;
    els[i].classList.add('is-on');
  }, 1800);
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
  jam(root);
  judge(root);
  tree(root);
  words(root);
  clock(root);
}
