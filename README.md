# Portfolio & Blog

[![Deploy](https://github.com/leonfullxr/mywebsite/actions/workflows/deploy.yml/badge.svg)](https://github.com/leonfullxr/mywebsite/actions/workflows/deploy.yml)
[![CI](https://github.com/leonfullxr/mywebsite/actions/workflows/ci.yml/badge.svg)](https://github.com/leonfullxr/mywebsite/actions/workflows/ci.yml)

Personal portfolio built with [Astro](https://astro.build/), Tailwind CSS, and Markdown blog posts. The site has English and Spanish content, dark mode, and a responsive layout.

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

GitHub Pages deploys the site through `.github/workflows/deploy.yml`. Push to `main` to start a deploy.

## CI/CD & Security

Each pull request and push runs these pipelines:

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

> **Note:** CodeQL, Dependency Review and Scorecard need a public repository or GitHub Advanced Security. Scorecard `publish_results` and SARIF uploads also need code scanning under **Settings → Code security**.

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

Personal data lives in `src/data/en.json` and `src/data/es.json`. Blog posts are Markdown files in `src/content/blog/`.
