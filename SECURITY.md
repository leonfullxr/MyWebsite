# Security Policy

## Supported Versions

This site is a static website with continuous deployment. Only the live version on the `main` branch is supported. The live URL is https://resume.leonfuller.com/.

## Reporting a Vulnerability

Report security issues in private. Do not open a public issue.

**Preferred:** open a [GitHub Security Advisory](https://github.com/leonfullxr/mywebsite/security/advisories/new). Go to GitHub → Security → Advisories → "Report a vulnerability".

**Alternative:** email **l.elliottfuller@gmail.com** with the details.

Include these items in your report:

1. A description of the vulnerability and its impact.
2. Steps to reproduce. Add a proof of concept if you can.
3. A suggested fix if you have one.

You should get an acknowledgement within **5 business days**. After we confirm and fix the issue, the site updates on the next push to `main`.

## Automated Security Controls

This repository runs these checks:

- **CodeQL** — static application security testing (SAST).
- **Dependency Review** — flags vulnerable or disallowed dependencies on pull requests.
- **Gitleaks** — secret scanning on commits and pull requests.
- **OpenSSF Scorecard** — supply-chain security posture.
- **Dependabot** — automated dependency and GitHub Actions updates.
- **npm audit** — production dependency vulnerability gate in CI.
