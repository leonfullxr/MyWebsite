# PROTOTYPE: landing-page redesign

Question: what should a full redesign of the landing page look like, so sections stop leaving
dead space and projects stop relying on a horizontal scroll strip?

Run `npm run dev` and open `/en/prototype-landing?variant=A` (or `B`, `C`, `D`). Use the pink
bar or the arrow keys to switch. The route is dev-only; production builds skip it.

Round 1 (bento grid, sidebar rail, editorial) was rejected. Round 2, all Lato:

- A: Scroll story (interactive). The hero photo shrinks into a frame while the name converges,
  the statement lights up word by word, an experience progress track fills, and project cards
  stack on top of each other. The thesis torus spins with scroll. Respects reduced motion.
- B: Swiss type (static). Giant Lato 900 name, strict 12-column grid, thin rules, numbered
  sections, grayscale images that turn colour on hover, a 3x3 project grid.
- C: Resume sheet (static). Profile card with an Alhambra banner, then a main column
  (about, experience, projects with "show all") and a sticky side column (skills,
  education, certifications, hobbies).
- D: Security console (static, always dark). Dashboard panels with status headers and counts,
  profile key/value panel, accordion experience, segmented project filter.

Verdict: _pending_

When a variant is picked, fold it into `src/components/*` properly and delete this folder
and `src/pages/en/[prototype].astro`.

## Round 3 (current)

Leon picked B ("Scroll journey") on 2026-10-01 and asked for: skills and certifications merged into
one section laid out like the other prototype set's variant A (`src/components/prototype-r3/`,
section "Stack and certifications"), skill icons styled like the live site's tech icons (grey until
hovered, no white tiles), a smaller Cypher image, and C and D removed. Done; A is kept for comparison.
