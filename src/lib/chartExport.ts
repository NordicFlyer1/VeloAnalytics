import { toPng } from 'html-to-image';

/**
 * Capture a DOM element as a PNG and trigger a download.
 * Currently uses the standard browser download method.
 */
export async function exportComponentAsImage(
  element: HTMLElement,
  fileName: string = 'velo-chart.png'
) {
  try {
    // Generate data URL from the element
    const dataUrl = await toPng(element, {
      backgroundColor: 'transparent',
      // Better quality for high-DPI displays
      pixelRatio: 2,
      // Ensure all font styles are captured correctly
      fontEmbedCSS: '',
      cacheBust: true,
      // Prevent transitions from causing "motion blur" during capture
      style: {
        transition: 'none',
        animation: 'none',
        transform: 'none'
      }
    });

    // Standard browser download approach
    const link = document.createElement('a');
    link.download = fileName;
    link.href = dataUrl;
    link.click();
  } catch (err) {
    console.error('Failed to export image:', err);
    throw new Error('Could not export chart image.');
  }
}
