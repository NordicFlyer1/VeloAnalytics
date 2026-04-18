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
      style: {
        borderRadius: '0',
      },
      // Ensure all font styles are captured correctly
      fontEmbedCSS: '',
      cacheBust: true,
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
