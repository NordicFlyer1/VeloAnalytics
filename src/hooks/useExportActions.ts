import { useState } from 'react';
import { format } from 'date-fns';
import { ActivitySummary, CyclingDataPoint } from '../types';
import { getActivityData } from '../services/storage';
import { exportToCSV } from '../lib/csvExport';

export interface ExportStatus {
  active: boolean;
  type: string;
  progress: number;
}

export const useExportActions = (
  summary: ActivitySummary | null,
  data: CyclingDataPoint[],
  currentActivityId: string | null,
  originalFile: File | null,
  setOriginalFile: (file: File | null) => void
) => {
  const [exportStatus, setExportStatus] = useState<ExportStatus>({
    active: false,
    type: '',
    progress: 0
  });

  const exportOriginal = async () => {
    let fileToExport = originalFile;
    
    if (!fileToExport && currentActivityId) {
      try {
        const stored = await getActivityData(currentActivityId);
        if (stored && stored.originalFile) {
          const fileName = stored.originalFileName || summary?.name || 'activity.fit';
          const blob = stored.originalFile instanceof Blob ? stored.originalFile : new Blob([stored.originalFile]);
          fileToExport = new File([blob], fileName, { type: blob.type || 'application/octet-stream' });
          setOriginalFile(fileToExport);
        }
      } catch (e) {
        console.error('Failed to fetch original file from IndexedDB for export:', e);
      }
    }

    if (!fileToExport) {
      console.error('No original file available for export');
      return;
    }

    setExportStatus({ active: true, type: 'Original', progress: 0 });
    
    try {
      await new Promise(resolve => setTimeout(resolve, 500));
      setExportStatus(prev => ({ ...prev, progress: 50 }));
      
      const url = URL.createObjectURL(fileToExport);
      const a = document.createElement('a');
      a.href = url;
      a.download = fileToExport.name;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      
      setExportStatus(prev => ({ ...prev, progress: 100 }));
    } catch (err) {
      console.error('Export failed:', err);
    } finally {
      setTimeout(() => setExportStatus({ active: false, type: '', progress: 0 }), 1000);
    }
  };

  const exportGPX = async () => {
    if (data.length === 0) return;
    setExportStatus({ active: true, type: 'GPX', progress: 0 });
    
    let gpx = `<?xml version="1.0" encoding="UTF-8"?>
<gpx version="1.1" creator="VeloAnalytics Pro" 
  xmlns="http://www.topografix.com/GPX/1/1" 
  xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" 
  xmlns:gpxtpx="http://www.garmin.com/xmlschemas/TrackPointExtension/v1"
  xsi:schemaLocation="http://www.topografix.com/GPX/1/1 http://www.topografix.com/GPX/1/1/gpx.xsd http://www.garmin.com/xmlschemas/TrackPointExtension/v1 http://www.garmin.com/xmlschemas/TrackPointExtensionv1.xsd">
  <metadata>
    <name>${summary?.name || 'Activity'}</name>
    <time>${data[0].timestamp && !isNaN(data[0].timestamp.getTime()) ? data[0].timestamp.toISOString() : new Date().toISOString()}</time>
  </metadata>
  <trk>
    <name>${summary?.name || 'Activity'}</name>
    <trkseg>`;

    const chunkSize = 500;
    for (let i = 0; i < data.length; i += chunkSize) {
      const chunk = data.slice(i, i + chunkSize);
      chunk.forEach(p => {
        if (p.latitude && p.longitude && p.timestamp && !isNaN(p.timestamp.getTime())) {
          gpx += `
      <trkpt lat="${p.latitude}" lon="${p.longitude}">
        ${p.altitude !== undefined ? `<ele>${p.altitude}</ele>` : ''}
        <time>${p.timestamp.toISOString()}</time>
        <extensions>
          ${p.power !== undefined ? `<power>${Math.round(p.power)}</power>` : ''}
          <gpxtpx:TrackPointExtension>
            ${p.heartRate !== undefined ? `<gpxtpx:hr>${Math.round(p.heartRate)}</gpxtpx:hr>` : ''}
            ${p.cadence !== undefined ? `<gpxtpx:cad>${Math.round(p.cadence)}</gpxtpx:cad>` : ''}
            ${p.temperature !== undefined ? `<gpxtpx:atemp>${Math.round(p.temperature)}</gpxtpx:atemp>` : ''}
          </gpxtpx:TrackPointExtension>
        </extensions>
      </trkpt>`;
        }
      });
      
      setExportStatus(prev => ({ ...prev, progress: Math.round((i / data.length) * 90) }));
      await new Promise(resolve => setTimeout(resolve, 0));
    }

    gpx += `
    </trkseg>
  </trk>
</gpx>`;

    setExportStatus(prev => ({ ...prev, progress: 95 }));

    const blob = new Blob([gpx], { type: 'application/gpx+xml' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${summary?.name || 'activity'}.gpx`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    
    setExportStatus(prev => ({ ...prev, progress: 100 }));
    setTimeout(() => setExportStatus({ active: false, type: '', progress: 0 }), 1000);
  };

  const exportFullCSV = async () => {
    if (data.length === 0) return;
    setExportStatus({ active: true, type: 'CSV', progress: 0 });
    
    try {
      const exportData = data.map(p => ({
        Timestamp: p.timestamp ? format(p.timestamp, 'yyyy-MM-dd HH:mm:ss') : '',
        Power: p.power !== undefined ? Math.round(p.power) : '',
        HeartRate: p.heartRate !== undefined ? Math.round(p.heartRate) : '',
        Cadence: p.cadence !== undefined ? Math.round(p.cadence) : '',
        Speed_KMH: p.speed !== undefined ? p.speed.toFixed(1) : '',
        Distance_M: p.distance !== undefined ? p.distance.toFixed(1) : '',
        Altitude_M: p.altitude !== undefined ? p.altitude.toFixed(1) : '',
        Latitude: p.latitude || '',
        Longitude: p.longitude || '',
        Slope: p.slope !== undefined ? p.slope.toFixed(1) : '',
        Temp: p.temperature !== undefined ? Math.round(p.temperature) : '',
        WPrimeBalance: p.wPrimeBalance !== undefined ? Math.round(p.wPrimeBalance) : ''
      }));

      const fileName = `Velo_FullData_${summary?.name || 'Activity'}_${new Date().getTime()}.csv`;
      
      setExportStatus(prev => ({ ...prev, progress: 50 }));
      exportToCSV(exportData, fileName);
      setExportStatus(prev => ({ ...prev, progress: 100 }));
    } catch (err) {
      console.error('Export failed:', err);
    } finally {
      setTimeout(() => setExportStatus({ active: false, type: '', progress: 0 }), 1000);
    }
  };

  return {
    exportStatus,
    exportOriginal,
    exportGPX,
    exportFullCSV
  };
};
