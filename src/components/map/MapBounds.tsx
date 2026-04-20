import React from 'react';
import { useMap as useLeafletMap } from 'react-leaflet';
import L from 'leaflet';
import { CyclingDataPoint } from '../../types';

interface MapBoundsProps {
  points: [number, number][];
  data: CyclingDataPoint[];
  activePoint: number | null;
  isPointLocked: boolean;
  isMapMaximized: boolean;
}

export const MapBounds = ({ points, data, activePoint, isPointLocked, isMapMaximized }: MapBoundsProps) => {
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
    // Only center map on point if it's LOCKED (clicked), otherwise just let the marker move
    if (activePoint !== null && isPointLocked && data[activePoint]?.latitude && data[activePoint]?.longitude) {
      map.setView([data[activePoint].latitude!, data[activePoint].longitude!], map.getZoom());
    }
  }, [activePoint, isPointLocked, data, map]);

  return null;
};
