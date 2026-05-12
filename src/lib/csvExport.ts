import { saveAs } from './fileSystem';

/**
 * Utility to export an array of objects to a CSV file.
 * Returns a promise that resolves when the export is complete.
 */
export async function exportToCSV(data: any[], fileName: string = 'export.csv') {
  if (!data || !data.length) return;

  const headers = Object.keys(data[0]);
  const csvRows = [];
  
  // Add headers
  csvRows.push(headers.join(','));

  // Add data rows
  for (const row of data) {
    const values = headers.map(header => {
      const val = row[header];
      const escaped = ('' + val).replace(/"/g, '""');
      return `"${escaped}"`;
    });
    csvRows.push(values.join(','));
  }

  const csvString = csvRows.join('\n');

  await saveAs(csvString, fileName, {
    description: 'CSV File',
    accept: { 'text/csv': ['.csv'] }
  });
}
