// PROTOTYPE: landing-page redesign sketches. Delete this folder once a variant is picked.
import fs from 'node:fs';
import path from 'node:path';
import en from '../../data/en.json';

export type Post = {
  title: string;
  date: string;
  description: string;
  tags: string[];
  slug: string;
  image: string | null;
};

export function getPosts(lang: string): Post[] {
  const dir = path.join(process.cwd(), 'src', 'content', 'blog', lang);
  if (!fs.existsSync(dir)) return [];
  return fs
    .readdirSync(dir)
    .filter((f) => f.endsWith('.md'))
    .map((file) => {
      const content = fs.readFileSync(path.join(dir, file), 'utf-8');
      const fm = content.match(/^---\n([\s\S]*?)\n---/)?.[1] ?? '';
      const tags = (fm.match(/tags:\s*\[(.+)\]/)?.[1] ?? '')
        .split(',')
        .map((t) => t.trim().replace(/"/g, ''))
        .filter(Boolean);
      return {
        title: fm.match(/title:\s*"(.+)"/)?.[1] ?? '',
        date: fm.match(/date:\s*"(.+)"/)?.[1] ?? '',
        description: fm.match(/description:\s*"(.+)"/)?.[1] ?? '',
        tags,
        slug: file.replace('.md', ''),
        image:
          fm.match(/image:\s*"(.+)"/)?.[1] ?? content.match(/!\[[^\]]*\]\(([^)\s]+)/)?.[1] ?? null,
      };
    })
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
}

export type Data = typeof en;

export const icons = {
  github:
    'M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z',
  linkedin:
    'M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z',
};

export type Icon = { name: string; src: string };

// Skills shown as logos only; the full text list belongs in the downloadable resume.
export const skillGroups: { name: string; icons: Icon[] }[] = [
  {
    name: 'Languages',
    icons: [
      { name: 'C', src: '/images/icons/c.svg' },
      { name: 'C++', src: '/images/icons/cplusplus.svg' },
      { name: 'Python', src: '/images/icons/python.svg' },
      { name: 'Go', src: '/images/icons/go.svg' },
      { name: 'TypeScript', src: '/images/icons/typescript.svg' },
      { name: 'JavaScript', src: '/images/icons/javascript.svg' },
      { name: 'Svelte', src: '/images/icons/svelte.svg' },
      { name: 'HTML', src: '/images/icons/html5.svg' },
      { name: 'CSS', src: '/images/icons/css3.svg' },
      { name: 'Bash', src: '/images/icons/bash.svg' },
    ],
  },
  {
    name: 'Security & search',
    icons: [
      { name: 'Wazuh', src: '/images/icons/wazuh.png' },
      { name: 'Elasticsearch', src: '/images/icons/elasticsearch.svg' },
      { name: 'OpenSearch', src: '/images/icons/opensearch.svg' },
    ],
  },
  {
    name: 'Cloud & infrastructure',
    icons: [
      { name: 'Docker', src: '/images/icons/docker.svg' },
      { name: 'Kubernetes', src: '/images/icons/kubernetes.svg' },
      { name: 'AWS', src: '/images/icons/aws.svg' },
      { name: 'Azure', src: '/images/icons/azure.svg' },
      { name: 'Linux', src: '/images/icons/linux.svg' },
      { name: 'Git', src: '/images/icons/git.svg' },
      { name: 'PostgreSQL', src: '/images/icons/postgresql.svg' },
    ],
  },
  {
    name: 'Graphics & games',
    icons: [
      { name: 'Godot', src: '/images/icons/godot.svg' },
      { name: 'Three.js', src: '/images/icons/threejs.svg' },
    ],
  },
];

export const allSkillIcons: Icon[] = skillGroups.flatMap((g) => g.icons);

// One entry per cv.awards item, same order. kind "badge" is an official issued badge image
// (show it large, uncropped); "logo" is an issuer logo to place inside a badge-shaped frame;
// "monogram" has no image, so draw the letters inside the frame.
export type Badge =
  | { kind: 'badge'; src: string }
  | { kind: 'logo'; src: string }
  | { kind: 'monogram'; letters: string };

export const awardBadges: Badge[] = [
  { kind: 'badge', src: '/images/badges/comptia-security-plus.png' },
  { kind: 'badge', src: '/images/badges/aws-ai-practitioner.png' },
  { kind: 'logo', src: '/images/icons/elasticsearch.svg' },
  { kind: 'badge', src: '/images/badges/aws-academy-cloud-developing.png' },
  { kind: 'logo', src: '/images/icons/si-udemy.svg' },
  { kind: 'monogram', letters: 'UGR' },
  { kind: 'logo', src: '/images/icons/si-udemy.svg' },
  { kind: 'logo', src: '/images/pichola.png' },
  { kind: 'monogram', letters: 'IF' },
];

// Natural size of each project image, so layouts can size tiles to the picture's shape.
export const imageSize: Record<string, { w: number; h: number }> = {
  '/images/potocolom.png': { w: 1024, h: 513 },
  '/images/hopf_torus.png': { w: 1920, h: 721 },
  '/images/cypher_logo.png': { w: 1024, h: 1024 },
  '/images/nextcloud_login.png': { w: 734, h: 605 },
  '/images/mushroom_classification.png': { w: 1985, h: 990 },
  '/images/ludo_game.png': { w: 764, h: 767 },
  '/images/visual_pathfinding.png': { w: 1824, h: 1880 },
  '/images/pichola.png': { w: 315, h: 250 },
};

// Posts without an image get a generated cover showing these logos for their tags.
export const tagIcons: Record<string, string> = {
  DevOps: '/images/icons/docker.svg',
  Linux: '/images/icons/linux.svg',
  Cybersecurity: '/images/icons/wazuh.png',
};

// "CompTIA Security+ ce - CompTIA (Sep 2026)" -> { title, issuer, date }.
export function splitAward(text: string) {
  const m = text.match(/^(.*?)\s*\(([^()]*)\)\s*$/);
  const body = m ? m[1] : text;
  const date = m ? m[2] : '';
  const cut = body.lastIndexOf(' - ');
  return cut === -1
    ? { title: body, issuer: '', date }
    : { title: body.slice(0, cut), issuer: body.slice(cut + 3), date };
}

export function awardText(a: string | { text: string; url?: string }) {
  return typeof a === 'string' ? { text: a, url: undefined } : a;
}
