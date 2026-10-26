/**
 * The branch name to start an issue's work on (D-087), as Kaneo's "Copy task branch": its key in lower case, then the
 * title's Latin words, so the push links the branch and moves the issue. A title with no Latin letters (a Korean one)
 * leaves just the key: `bit-42`, `bit-42-login-fails-on-safari`.
 */
export function branchName(reference: string, title: string): string {
  const words = title.normalize('NFKD').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
  const slug = words.split('-').filter(Boolean).slice(0, 6).join('-').slice(0, 40).replace(/-+$/, '');
  return slug ? `${reference.toLowerCase()}-${slug}` : reference.toLowerCase();
}
