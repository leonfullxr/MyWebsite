# Security Policy

## Supported Versions

This is a continuously deployed static website. Only the currently deployed
version (the `main` branch, served at https://resume.leonfuller.com/) is
supported.

## Reporting a Vulnerability

If you discover a security vulnerability, please report it privately:

- Preferred: open a [GitHub Security Advisory](https://github.com/leonfullxr/mywebsite/security/advisories/new)
  (GitHub > Security > Advisories > "Report a vulnerability").
- Alternatively, email **l.elliottfuller@gmail.com** with the details.

Please do **not** open a public issue for security reports.

When reporting, include:

- A description of the vulnerability and its impact.
- Steps to reproduce (proof of concept if possible).
- Any suggested remediation.

You can expect an acknowledgement within **5 business days**. Once the issue
is confirmed and fixed, the deployed site is updated automatically on the next
push to `main`.

## Automated Security Controls

This repository runs the following automated checks:

- **CodeQL** — static application security testing (SAST).
- **Dependency Review** — flags vulnerable/disallowed dependencies on pull requests.
- **Gitleaks** — secret scanning on commits and pull requests.
- **OpenSSF Scorecard** — supply-chain security posture.
- **Dependabot** — automated dependency and GitHub Actions updates.
- **npm audit** — production dependency vulnerability gate in CI.
