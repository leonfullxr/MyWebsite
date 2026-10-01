# PROTOTYPE: landing-page redesign

Question: how should the landing page be laid out so sections stop leaving dead space
(skills grid with an orphaned card, tall section padding) and projects stop relying on a
horizontal scroll strip?

Run `npm run dev` and open `/en/prototype-landing?variant=A` (or `B`, `C`). Use the
pink bar or the arrow keys to switch. The route is dev-only; production builds skip it.

- A: Bento grid. One tile grid for the whole page. Projects use an auto-fill grid with a
  featured 2x2 tile and a "Show all" button.
- B: Sidebar rail. Sticky left rail with identity, scrollspy nav and skills. The right
  column holds content; projects are dense rows with thumbnails.
- C: Editorial. Alhambra hero kept, sections on a 12-column grid with a sticky label column.
  Skills are a 4-column matrix. Projects are one featured item plus a masonry grid.

Verdict: _pending_

When a variant is picked, fold it into `src/components/*` properly and delete this folder
and `src/pages/en/[prototype].astro`.
