# Portfolio & Blog

[![Deploy](https://github.com/leonfullxr/mywebsite/actions/workflows/deploy.yml/badge.svg)](https://github.com/leonfullxr/mywebsite/actions/workflows/deploy.yml)
[![CI](https://github.com/leonfullxr/mywebsite/actions/workflows/ci.yml/badge.svg)](https://github.com/leonfullxr/mywebsite/actions/workflows/ci.yml)

Personal portfolio built with [Astro](https://astro.build/), Tailwind CSS, and Markdown blog support. Features bilingual content (English/Spanish), dark mode, and responsive design.

## Getting Started

```bash
npm install
npm run dev
```

## Scripts

| Command                | Description                                        |
| ---------------------- | -------------------------------------------------- |
| `npm run dev`          | Start the local dev server                         |
| `npm run build`        | Build the static site into `dist/`                 |
| `npm run preview`      | Preview the production build locally               |
| `npm run check`        | Type-check (`astro check`)                         |
| `npm run format`       | Format the codebase with Prettier                  |
| `npm run format:check` | Verify formatting (used in CI)                     |
| `npm run audit:prod`   | Audit production dependencies for high+ advisories |

## Deployment

The site is configured for GitHub Pages deployment via the `.github/workflows/deploy.yml` workflow. Push to `main` to trigger automatic deployment.

## CI/CD & Security

Every pull request and push is validated by a set of automated pipelines:

| Workflow              | Trigger              | Purpose                                                   |
| --------------------- | -------------------- | --------------------------------------------------------- |
| **CI**                | PRs, non-main pushes | Prettier check, `astro check`, build, prod `npm audit`    |
| **Deploy**            | Push to `main`       | Type-check, build and publish to GitHub Pages             |
| **CodeQL**            | PRs, `main`, weekly  | Static application security testing (SAST)                |
| **Dependency Review** | PRs                  | Blocks vulnerable / disallowed-license dependency changes |
| **Gitleaks**          | PRs, pushes          | Secret scanning                                           |
| **OpenSSF Scorecard** | `main`, weekly       | Supply-chain security posture                             |
| **Lighthouse**        | PRs                  | Performance, accessibility, best-practices & SEO audits   |
| **Link Check**        | Weekly               | Detects broken links and opens a tracking issue           |
| **Dependabot**        | Weekly               | Automated npm & GitHub Actions updates                    |

> **Note:** CodeQL, Dependency Review and Scorecard require the repository to be
> public (or to have GitHub Advanced Security enabled). Scorecard's
> `publish_results` and code-scanning SARIF uploads also need code scanning to be
> enabled under **Settings → Code security**.

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
