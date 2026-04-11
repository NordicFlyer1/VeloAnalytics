import React from 'react';
import { useMap as useLeafletMap } from 'react-leaflet';
import L from 'leaflet';
import { CyclingDataPoint } from '../types';

interface MapBoundsProps {
  points: [number, number][];
  data: CyclingDataPoint[];
  activePoint: number | null;
  isMapMaximized: boolean;
}

export const MapBounds = ({ points, data, activePoint, isMapMaximized }: MapBoundsProps) => {
  const map = useLeafletMap();
  
  React.useEffect(() => {
    if (points.length > 0 && activePoint === null) {
      const bounds = L.latLngBounds(points);
      const isMobile = window.innerWidth < 640;
      map.fitBounds(bounds, { padding: isMobile ? [50, 150] : [100, 100] });
    }
  }, [points, map, activePoint]);

  React.useEffect(() => {
    const container = map.getContainer();
    const observer = new ResizeObserver(() => {
      map.invalidateSize();
      if (points.length > 0 && activePoint === null) {
        const bounds = L.latLngBounds(points);
        const isMobile = window.innerWidth < 640;
        map.fitBounds(bounds, { padding: isMobile ? [50, 150] : [100, 100] });
      }
    });
    observer.observe(container);
    return () => observer.disconnect();
  }, [map, points, activePoint]);

  React.useEffect(() => {
    if (activePoint !== null && data[activePoint]?.latitude && data[activePoint]?.longitude) {
      map.setView([data[activePoint].latitude!, data[activePoint].longitude!], map.getZoom());
    }
  }, [activePoint, data, map]);

  return null;
};
