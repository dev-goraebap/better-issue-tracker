/** A colour the theme gives a token here, as #rrggbb whatever form it is written in (light-dark, color-mix, oklch). */
function colorOf(place: Element, token: string) {
  const probe = document.createElement('span');
  probe.style.color = `var(${token})`;
  place.append(probe);
  const value = getComputedStyle(probe).color;
  probe.remove();
  const canvas = document.createElement('canvas');
  canvas.width = canvas.height = 1;
  const paint = canvas.getContext('2d');
  if (!paint) return '#888888';
  paint.fillStyle = value;
  paint.fillRect(0, 0, 1, 1);
  const [r, g, b] = paint.getImageData(0, 0, 1, 1).data;
  return `#${[r, g, b].map(each => (each ?? 0).toString(16).padStart(2, '0')).join('')}`;
}

let count = 0;

/**
 * Diagrams already drawn, by their code and the look they were drawn in: the editor that opens over the text as read
 * (BIT-99) shows the same drawing at once, so nothing below it moves while it would be drawn again.
 */
const drawnBefore = new Map<string, string>();
export const drawnDiagram = (key: string) => drawnBefore.get(key);
export const keepDiagram = (key: string, svg: string) => { drawnBefore.set(key, svg); if (drawnBefore.size > 50) drawnBefore.delete(drawnBefore.keys().next().value!); };

/**
 * A Mermaid diagram as SVG markup in the page's own colours and type (BIT-95), read from where it will be shown so the
 * light and dark modes and the colour themes each draw it in theirs. Mermaid itself loads only the first time a
 * diagram is drawn. A diagram Mermaid cannot read rejects with its message.
 */
export async function renderMermaid(code: string, place: Element): Promise<string> {
  const { default: mermaid } = await import('mermaid');
  const surface = colorOf(place, '--color-background-surface');
  const isDark = Number.parseInt(surface.slice(1, 3), 16) < 128;
  mermaid.initialize({
    startOnLoad: false,
    securityLevel: 'strict',
    theme: 'base',
    fontFamily: getComputedStyle(place).fontFamily,
    themeVariables: {
      darkMode: isDark,
      fontSize: '14px',
      background: surface,
      primaryColor: colorOf(place, '--color-background-muted'),
      primaryTextColor: colorOf(place, '--color-text-primary'),
      primaryBorderColor: colorOf(place, '--color-border-emphasized'),
      secondaryColor: colorOf(place, '--color-background-card'),
      tertiaryColor: colorOf(place, '--color-background-surface'),
      lineColor: colorOf(place, '--color-text-secondary'),
      textColor: colorOf(place, '--color-text-primary'),
      noteBkgColor: colorOf(place, '--color-background-gray'),
      noteTextColor: colorOf(place, '--color-text-primary'),
    },
  });
  count += 1;
  const { svg } = await mermaid.render(`bit-mermaid-${count}`, code);
  return svg;
}
