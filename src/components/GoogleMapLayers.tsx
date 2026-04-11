import React from 'react';
import { useMap as useGoogleMap } from '@vis.gl/react-google-maps';
import { CyclingDataPoint } from '../types';

interface GoogleMapPolylineProps {
  points: { lat: number; lng: number }[];
  data: CyclingDataPoint[];
  setActivePoint: (index: number | null) => void;
  setIsPointLocked: (locked: boolean) => void;
  isMapMaximized: boolean;
}

export const GoogleMapPolyline = ({ 
  points, 
  data, 
  setActivePoint, 
  setIsPointLocked, 
  isMapMaximized 
}: GoogleMapPolylineProps) => {
  const map = useGoogleMap();
  React.useEffect(() => {
    if (!map || points.length === 0) return;

    const polyline = new google.maps.Polyline({
      path: points,
      geodesic: true,
      strokeColor: "#f97316",
      strokeOpacity: 0.8,
      strokeWeight: 4,
    });

    polyline.setMap(map);

    const findClosestPointIndex = (lat: number, lng: number) => {
      let minDistance = Infinity;
      let closestIndex = -1;
      
      data.forEach((p, index) => {
        if (p.latitude !== undefined && p.longitude !== undefined) {
          const d = Math.pow(p.latitude - lat, 2) + Math.pow(p.longitude - lng, 2);
          if (d < minDistance) {
            minDistance = d;
            closestIndex = index;
          }
        }
      });
      
      return closestIndex;
    };

    const mouseMoveListener = polyline.addListener('mousemove', (e: google.maps.PolyMouseEvent) => {
      if (e.latLng) {
        const index = findClosestPointIndex(e.latLng.lat(), e.latLng.lng());
        if (index !== -1) setActivePoint(index);
      }
    });

    const mouseOutListener = polyline.addListener('mouseout', () => {
      setActivePoint(null);
    });

    const clickListener = polyline.addListener('click', (e: google.maps.PolyMouseEvent) => {
      if (e.latLng) {
        const index = findClosestPointIndex(e.latLng.lat(), e.latLng.lng());
        if (index !== -1) {
          setActivePoint(index);
          setIsPointLocked(true);
        }
      }
    });

    const bounds = new google.maps.LatLngBounds();
    points.forEach(p => bounds.extend(p));
    const isMobile = window.innerWidth < 640;
    map.fitBounds(bounds, isMobile ? { top: 150, bottom: 150, left: 50, right: 50 } : 100);

    const observer = new ResizeObserver(() => {
      google.maps.event.trigger(map, 'resize');
      map.fitBounds(bounds, isMobile ? { top: 150, bottom: 150, left: 50, right: 50 } : 100);
    });
    const container = map.getDiv();
    observer.observe(container);

    return () => {
      polyline.setMap(null);
      google.maps.event.removeListener(mouseMoveListener);
      google.maps.event.removeListener(mouseOutListener);
      google.maps.event.removeListener(clickListener);
      observer.disconnect();
    };
  }, [map, points, data, setActivePoint, setIsPointLocked, isMapMaximized]);

  return null;
};

export const GoogleMapTrafficLayer = ({ enabled }: { enabled: boolean }) => {
  const map = useGoogleMap();
  React.useEffect(() => {
    if (!map) return;
    const layer = new google.maps.TrafficLayer();
    if (enabled) layer.setMap(map);
    return () => layer.setMap(null);
  }, [map, enabled]);
  return null;
};

export const GoogleMapBicyclingLayer = ({ enabled }: { enabled: boolean }) => {
  const map = useGoogleMap();
  React.useEffect(() => {
    if (!map) return;
    const layer = new google.maps.BicyclingLayer();
    if (enabled) layer.setMap(map);
    return () => layer.setMap(null);
  }, [map, enabled]);
  return null;
};

export const GoogleMapTransitLayer = ({ enabled }: { enabled: boolean }) => {
  const map = useGoogleMap();
  React.useEffect(() => {
    if (!map) return;
    const layer = new google.maps.TransitLayer();
    if (enabled) layer.setMap(map);
    return () => layer.setMap(null);
  }, [map, enabled]);
  return null;
};
