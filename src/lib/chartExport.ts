import { toCanvas } from 'html-to-image';
import { saveAs } from './fileSystem';

/**
 * Capture a DOM element as a PNG and trigger a download.
 * Uses central saveAs utility for Save As experience.
 */
export async function exportComponentAsImage(
  element: HTMLElement,
  fileName: string = 'velo-chart.png'
) {
  try {
    // 1. Brief delay to let click animations or layout shifts settle
    await new Promise(resolve => setTimeout(resolve, 200));

    // 2. Add a temporary style to disable ALL transitions and animations on children
    // This prevents "motion blur" ghosting
    const style = document.createElement('style');
    style.innerHTML = `
      * {
        transition: none !important;
        animation: none !important;
        transition-property: none !important;
        transition-duration: 0s !important;
        transition-delay: 0s !important;
      }
    `;
    document.head.appendChild(style);

    // 3. Detect theme and configure exact calibrated snapshot palette:
    // - In Dark Mode: Canvas outer base is #0a0a0a, while the elevated card container
    //   renders as authentic dark charcoal (#17171a), giving the exact 3-layer visual depth
    //   and contrast seen onscreen with inset tiles (#0a0a0a).
    // - In Light Mode: Solid #ffffff with original day variables, 100% preserved.
    const isDark = 
      document.documentElement.classList.contains('dark') ||
      document.body.classList.contains('dark') ||
      element.closest('.dark') !== null;

    const canvasBg = isDark ? '#0a0a0a' : '#ffffff';

    // 4. Capture to Canvas (rasterizes complex CSS effects and glassmorphism over solid canvas)
    const canvas = await toCanvas(element, {
      backgroundColor: canvasBg,
      pixelRatio: 3, // High DPI for crispness
      fontEmbedCSS: '',
      cacheBust: true,
      // Exclude UI elements that shouldn't be in the snapshot (like buttons/menus)
      filter: (node: HTMLElement) => {
        const isIgnore = node.classList?.contains('export-ignore');
        return !isIgnore;
      },
      style: {
        transition: 'none',
        animation: 'none',
        transform: 'none',
        colorScheme: isDark ? 'dark' : 'light',
        backgroundColor: isDark ? '#17171a' : '#ffffff',
        ...(isDark ? {
          '--app-bg': '#0a0a0a',
          '--app-card': '#17171a',
          '--app-border': 'rgba(255, 255, 255, 0.1)',
          '--app-text': '#ffffff',
          '--app-muted': 'rgba(255, 255, 255, 0.45)'
        } : {
          '--app-bg': '#f8f9fa',
          '--app-card': '#ffffff',
          '--app-border': 'rgba(0, 0, 0, 0.1)',
          '--app-text': '#1a1a1a',
          '--app-muted': 'rgba(0, 0, 0, 0.5)'
        })
      } as any
    });

    // 5. Cleanup the temporary styles immediately after capture
    document.head.removeChild(style);

    // 6. Convert canvas to Blob (needed for streaming to writable in FS API)
    const blob = await new Promise<Blob | null>(resolve => canvas.toBlob(resolve, 'image/png', 1.0));
    if (!blob) throw new Error('Canvas to Blob conversion failed.');

    // 7. Use central saveAs utility
    await saveAs(blob, fileName, {
      description: 'PNG Image',
      accept: { 'image/png': ['.png'] }
    });
  } catch (err) {
    console.error('Failed to export image:', err);
    throw new Error('Could not export chart image.');
  }
}
