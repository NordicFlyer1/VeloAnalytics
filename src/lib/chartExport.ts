import { toCanvas } from 'html-to-image';

/**
 * Capture a DOM element as a PNG and trigger a download.
 * Currently uses the standard browser download method.
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

    // 3. Capture to Canvas first (more stable for rasterizing complex CSS effects)
    const canvas = await toCanvas(element, {
      backgroundColor: 'transparent',
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
        transform: 'none'
      }
    });

    // 4. Cleanup the temporary styles immediately after capture
    document.head.removeChild(style);

    // 5. Convert canvas to PNG Data URL
    const dataUrl = canvas.toDataURL('image/png', 1.0);

    // 6. Standard browser download approach
    const link = document.createElement('a');
    link.download = fileName;
    link.href = dataUrl;
    link.click();
  } catch (err) {
    console.error('Failed to export image:', err);
    throw new Error('Could not export chart image.');
  }
}
