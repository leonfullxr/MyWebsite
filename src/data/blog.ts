/** Estimate reading time from prose, excluding frontmatter, code blocks and HTML tags. */
export function readingMinutes(markdown: string): number {
  const words =
    markdown
      .replace(/^---\n[\s\S]*?\n---\n/, '')
      .replace(/```[\s\S]*?```/g, ' ')
      .replace(/<[^>]*>/g, ' ')
      .replace(/!?\[([^\]]*)\]\([^)]*\)/g, '$1')
      .match(/[\p{L}\p{N}]+/gu)?.length ?? 0;
  return Math.max(1, Math.ceil(words / 200));
}
