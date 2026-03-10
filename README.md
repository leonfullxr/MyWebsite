# Leon Elliott Fuller — Portfolio & Blog

Personal portfolio built with [Astro](https://astro.build/), Tailwind CSS, and Markdown blog support. Features bilingual content (English/Spanish), dark mode, and responsive design.

## Getting Started

```bash
npm install
npm run dev
```

## Deployment

The site is configured for GitHub Pages deployment via the `.github/workflows/deploy.yml` workflow. Push to `main` to trigger automatic deployment.

## Structure

```
src/
├── components/     # Astro components (Nav, Hero, About, CV, Projects, Blog, etc.)
├── content/blog/   # Markdown blog posts (en/ and es/)
├── data/           # JSON data files for en.json and es.json
├── layouts/        # Base layout
├── pages/          # Route pages
└── styles/         # Global CSS
public/
└── images/         # Static images
```

## Customization

All personal information is centralized in `src/data/en.json` and `src/data/es.json`. Blog posts are Markdown files in `src/content/blog/`.
