// Assets and helpers for the homepage (src/components/Home.astro).
import fs from 'node:fs';
import path from 'node:path';
import en from './en.json';

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

export const thesisRepositoryURL = 'https://github.com/leonfullxr/ECC-Thesis';

export const icons = {
  github:
    'M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z',
  linkedin:
    'M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z',
};

export type Icon = { name: string; src: string };

// Skills shown as logos only; the full text list belongs in the downloadable resume.
// `id` is looked up in home.skillGroups of en.json / es.json for the visible label.
export const skillGroups: {
  id: 'languages' | 'security' | 'cloud' | 'graphics' | 'aiml';
  icons: Icon[];
}[] = [
  {
    id: 'languages',
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
    id: 'security',
    icons: [
      { name: 'Wazuh', src: '/images/icons/wazuh.png' },
      { name: 'Elasticsearch', src: '/images/icons/elasticsearch.svg' },
      { name: 'OpenSearch', src: '/images/icons/opensearch.svg' },
    ],
  },
  {
    id: 'cloud',
    icons: [
      { name: 'Docker', src: '/images/icons/docker.svg' },
      { name: 'Kubernetes', src: '/images/icons/kubernetes.svg' },
      { name: 'AWS', src: '/images/icons/aws.svg' },
      { name: 'Azure', src: '/images/icons/azure.svg' },
      { name: 'Linux', src: '/images/icons/linux.svg' },
      { name: 'Git', src: '/images/icons/git.svg' },
      { name: 'PostgreSQL', src: '/images/icons/postgresql.svg' },
      { name: 'Redis', src: '/images/icons/redis.svg' },
    ],
  },
  {
    id: 'graphics',
    icons: [
      { name: 'Godot', src: '/images/icons/godot.svg' },
      { name: 'Three.js', src: '/images/icons/threejs.svg' },
    ],
  },
  {
    id: 'aiml',
    icons: [
      { name: 'PyTorch', src: '/images/icons/pytorch.svg' },
      { name: 'FastAPI', src: '/images/icons/fastapi.svg' },
      { name: 'CUDA', src: '/images/icons/nvidia.svg' },
      { name: 'OpenCV', src: '/images/icons/opencv.svg' },
      { name: 'scikit-learn', src: '/images/icons/scikitlearn.svg' },
      { name: 'NumPy', src: '/images/icons/numpy.svg' },
      { name: 'Pandas', src: '/images/icons/pandas.svg' },
      { name: 'Jupyter', src: '/images/icons/jupyter.svg' },
      { name: 'Matplotlib', src: '/images/icons/matplotlib.svg' },
      { name: 'OpenGL', src: '/images/icons/opengl.svg' },
    ],
  },
];

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
  { kind: 'badge', src: '/images/badges/aws-cloud-practitioner.png' },
  { kind: 'logo', src: '/images/icons/elasticsearch.svg' },
  { kind: 'badge', src: '/images/badges/aws-academy-cloud-developing.png' },
  { kind: 'logo', src: '/images/icons/cert-ml.svg' },
  { kind: 'logo', src: '/images/icons/cert-ml.svg' },
  { kind: 'logo', src: '/images/icons/si-udemy.svg' },
  { kind: 'logo', src: '/images/pichola.png' },
  { kind: 'logo', src: '/images/icons/cert-game.svg' },
];

// Natural size of each project image, so the homepage can size it to the picture's shape.
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

// Experience impact board: logo sets shown when a card opens.
export const platforms: Icon[] = [
  { name: 'AWS', src: '/images/icons/aws.svg' },
  { name: 'Google Cloud', src: '/images/icons/googlecloud.svg' },
  { name: 'Azure', src: '/images/icons/azure.svg' },
  { name: 'Active Directory', src: '/images/icons/active-directory.svg' },
  { name: 'Microsoft 365', src: '/images/icons/microsoft365.svg' },
  { name: 'Google Workspace', src: '/images/icons/google.svg' },
  { name: 'Okta', src: '/images/icons/okta.svg' },
  { name: 'FortiGate', src: '/images/icons/fortinet.svg' },
  { name: 'Sophos', src: '/images/icons/sophos.svg' },
  { name: 'Cisco', src: '/images/icons/cisco.svg' },
  { name: 'Cortex XDR', src: '/images/icons/paloaltonetworks.svg' },
  { name: 'Splunk SOAR', src: '/images/icons/splunk.svg' },
  { name: 'VirusTotal', src: '/images/icons/virustotal.svg' },
  { name: 'MISP', src: '/images/icons/misp.svg' },
  { name: 'AlienVault OTX', src: '/images/icons/alienvault-otx.png' },
];
export const clusters: Icon[] = [
  { name: 'AWS EKS', src: '/images/icons/amazoneks.svg' },
  { name: 'Google Cloud', src: '/images/icons/googlecloud.svg' },
  { name: 'Azure AKS', src: '/images/icons/azure.svg' },
  { name: 'Proxmox', src: '/images/icons/proxmox.svg' },
];
// 24px stroke icons for the impact themes.
export const impactIcons: Record<string, string> = {
  layers: 'M12 3 2 8l10 5 10-5-10-5zM2 13l10 5 10-5M2 18l10 5 10-5',
  gauge: 'M12 14l4-4M3.5 18a9 9 0 1 1 17 0',
  down: 'M3 7l6 6 4-4 8 8M21 11v6h-6',
  buoy: 'M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18zm0 5a4 4 0 1 0 0 8 4 4 0 0 0 0-8zM5.6 5.6l3.6 3.6M14.8 14.8l3.6 3.6M18.4 5.6l-3.6 3.6M9.2 14.8l-3.6 3.6',
  branch:
    'M6 3v12M18 9a3 3 0 1 0 0-6 3 3 0 0 0 0 6zM6 21a3 3 0 1 0 0-6 3 3 0 0 0 0 6zM18 9a9 9 0 0 1-9 9',
  plug: 'M9 2v6M15 2v6M6 8h12v4a6 6 0 0 1-12 0V8zM12 18v4',
  zap: 'M13 2 3 14h9l-1 8 10-12h-9l1-8z',
  shield: 'M12 3l8 3v6c0 5-3.5 8-8 9-4.5-1-8-4-8-9V6l8-3zM9 12l2 2 4-4',
};

// What each project is built with, keyed by its image (the same in both languages).
const i = (name: string, file: string): Icon => ({ name, src: `/images/icons/${file}` });
export const projectStacks: Record<string, Icon[]> = {
  '/images/potocolom.png': [
    i('SvelteKit', 'svelte.svg'),
    i('FastAPI', 'fastapi.svg'),
    i('PostgreSQL', 'postgresql.svg'),
    i('Redis', 'redis.svg'),
    i('CUDA', 'nvidia.svg'),
    i('Docker', 'docker.svg'),
  ],
  '/images/hopf_torus.png': [i('C++', 'cplusplus.svg'), i('Docker', 'docker.svg')],
  '/images/cypher_logo.png': [
    i('React', 'react.svg'),
    i('Node.js', 'nodedotjs.svg'),
    i('Express', 'express.svg'),
    i('Socket.IO', 'socketdotio.svg'),
    i('MongoDB', 'mongodb.svg'),
    i('Docker', 'docker.svg'),
  ],
  '/images/nextcloud_login.png': [
    i('Docker', 'docker.svg'),
    i('Traefik', 'traefikproxy.svg'),
    i('PostgreSQL', 'postgresql.svg'),
    i('Redis', 'redis.svg'),
    i("Let's Encrypt", 'letsencrypt.svg'),
  ],
  '/images/mushroom_classification.png': [
    i('Python', 'python.svg'),
    i('Jupyter', 'jupyter.svg'),
    i('scikit-learn', 'scikitlearn.svg'),
    i('NumPy', 'numpy.svg'),
    i('Matplotlib', 'matplotlib.svg'),
  ],
  '/images/ludo_game.png': [i('C++', 'cplusplus.svg')],
  '/images/visual_pathfinding.png': [i('C++', 'cplusplus.svg')],
  '/images/pichola.png': [i('Godot', 'godot.svg')],
};
// How each picture sits in a square polaroid: logos and diagrams are contained on their own colour.
export const polaroidFit: Record<string, { fit: 'cover' | 'contain'; bg: string }> = {
  '/images/potocolom.png': { fit: 'cover', bg: '#14151a' },
  '/images/hopf_torus.png': { fit: 'cover', bg: '#f1f1f1' },
  '/images/cypher_logo.png': { fit: 'contain', bg: '#ffffff' },
  '/images/nextcloud_login.png': { fit: 'cover', bg: '#2b6c8e' },
  '/images/mushroom_classification.png': { fit: 'contain', bg: '#ffffff' },
  '/images/ludo_game.png': { fit: 'cover', bg: '#b4501a' },
  '/images/visual_pathfinding.png': { fit: 'cover', bg: '#e9e9e9' },
  '/images/pichola.png': { fit: 'contain', bg: '#f6c9a0' },
};
// Dark logos that need inverting in dark mode wherever they sit on the page ground.
export const monoLogos = new Set([
  'Three.js',
  'Wazuh',
  'AWS',
  'OpenSearch',
  'Bash',
  'NumPy',
  'Pandas',
  'Express',
  'Socket.IO',
]);
