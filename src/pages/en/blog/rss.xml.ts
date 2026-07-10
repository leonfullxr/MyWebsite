import rss from '@astrojs/rss';
import fs from 'node:fs';
import path from 'node:path';
import type { APIContext } from 'astro';

export function GET(context: APIContext) {
  const blogDir = path.join(process.cwd(), 'src', 'content', 'blog', 'en');
  const files = fs.existsSync(blogDir)
    ? fs.readdirSync(blogDir).filter((f) => f.endsWith('.md'))
    : [];
  const items = files
    .map((file) => {
      const content = fs.readFileSync(path.join(blogDir, file), 'utf-8');
      const fm = content.match(/^---\n([\s\S]*?)\n---/)?.[1] || '';
      return {
        title: fm.match(/title:\s*"(.+)"/)?.[1] || file,
        description: fm.match(/description:\s*"(.+)"/)?.[1] || '',
        pubDate: new Date(fm.match(/date:\s*"(.+)"/)?.[1] || Date.now()),
        link: `/en/blog/${file.replace('.md', '')}/`,
      };
    })
    .sort((a, b) => b.pubDate.getTime() - a.pubDate.getTime());

  return rss({
    title: 'Leon Elliott Fuller - Blog',
    description: 'Cybersecurity, infrastructure and AI engineering writeups.',
    site: context.site!,
    items,
    customData: '<language>en</language>',
  });
}
