import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Map as MapIcon, 
  Expand, 
  Maximize, 
  Navigation, 
  CheckCircle2,
  Car,
  Bike,
  Bus
} from 'lucide-react';
import { MapContainer, TileLayer, Polyline as LeafletPolyline, CircleMarker } from 'react-leaflet';
import { APIProvider, Map as GoogleMap, ControlPosition } from '@vis.gl/react-google-maps';
import { cn } from '../lib/utils';
import { WeatherData, CyclingDataPoint } from '../types';
import { SectionHeader } from './SectionHeader';
import { WeatherCard } from './WeatherCard';
import { MapBounds } from './MapBounds';
import { 
  GoogleMapPolyline, 
  GoogleMapTrafficLayer, 
  GoogleMapBicyclingLayer, 
  GoogleMapTransitLayer 
} from './GoogleMapLayers';

interface ActivityMapProps {
  isMapExpanded: boolean;
  setIsMapExpanded: (expanded: boolean) => void;
  mapContainerRef: React.RefObject<HTMLDivElement>;
  isMapMaximized: boolean;
  setIsMapMaximized: (maximized: boolean) => void;
  toggleFullScreen: () => void;
  setActivePoint: (index: number | null) => void;
  setIsPointLocked: (locked: boolean) => void;
  mapProvider: 'osm' | 'google';
  setMapProvider: (provider: 'osm' | 'google') => void;
  weather: WeatherData | null;
  isWeatherLoading: boolean;
  gpsPoints: [number, number][];
  activePoint: number | null;
  isPointLocked: boolean;
  mapType: any;
  setMapType: (type: any) => void;
  theme: 'light' | 'dark';
  data: CyclingDataPoint[];
  showTraffic: boolean;
  setShowTraffic: (show: boolean) => void;
  showBicycling: boolean;
  setShowBicycling: (show: boolean) => void;
  showTransit: boolean;
  setShowTransit: (show: boolean) => void;
  googleMapRef: React.RefObject<any>;
}

export const ActivityMap = React.memo(({
  isMapExpanded,
  setIsMapExpanded,
  mapContainerRef,
  isMapMaximized,
  setIsMapMaximized,
  toggleFullScreen,
  setActivePoint,
  setIsPointLocked,
  mapProvider,
  setMapProvider,
  weather,
  isWeatherLoading,
  gpsPoints,
  activePoint,
  isPointLocked,
  mapType,
  setMapType,
  theme,
  data,
  showTraffic,
  setShowTraffic,
  showBicycling,
  setShowBicycling,
  showTransit,
  setShowTransit,
  googleMapRef
}: ActivityMapProps) => {
  return (
    <div className="bg-app-card border border-app-border rounded-3xl p-8">
      <SectionHeader 
        icon={MapIcon}
        title="Activity Map"
        description="GPS track visualization with interactive data point inspection"
        isExpanded={isMapExpanded}
        onToggle={() => setIsMapExpanded(!isMapExpanded)}
      />

      <AnimatePresence>
        {isMapExpanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.3 }}
          >
            <div 
              ref={mapContainerRef}
              className={cn(
                "bg-app-bg border border-app-border rounded-2xl relative overflow-hidden group transition-all duration-500",
                isMapMaximized ? "h-[750px] sm:h-[900px]" : "h-[450px] sm:h-[600px]"
              )}
            >
              {/* Unified Header Bar - Stacked Top Right */}
              <div className="absolute top-2 right-2 sm:top-4 sm:right-4 z-20 flex flex-col items-end gap-2 pointer-events-none">
                <div className="pointer-events-auto flex items-center gap-2">
                  <div className="bg-app-bg/90 backdrop-blur-md p-1 rounded-full border border-app-border flex items-center gap-1 shadow-lg">
                    <button 
                      onClick={toggleFullScreen}
                      className="p-1.5 rounded-full text-app-muted hover:text-orange-500 transition-all"
                      title="Full Screen"
                    >
                      <Expand className="w-3.5 h-3.5" />
                    </button>
                    <button 
                      onClick={() => setIsMapMaximized(!isMapMaximized)}
                      className={cn(
                        "p-2 rounded-xl transition-all",
                        isMapMaximized ? "bg-orange-500 text-black" : "text-app-muted hover:text-orange-500 hover:bg-orange-500/10"
                      )}
                      title={isMapMaximized ? "Minimize Map" : "Maximize Map"}
                    >
                      <Maximize className="w-4 h-4" />
                    </button>
                    <button 
                      onClick={() => {
                        setActivePoint(null);
                        setIsPointLocked(false);
                      }}
                      className="p-1.5 rounded-full text-app-muted hover:text-orange-500 transition-all"
                      title="Fit to Course"
                    >
                      <Navigation className="w-3.5 h-3.5" />
                    </button>
                    <div className="w-px h-4 bg-app-border mx-0.5 sm:mx-1 self-center" />
                    <div className="flex gap-0.5">
                      <button 
                        onClick={() => setMapProvider('osm')}
                        className={cn(
                          "px-2 sm:px-2.5 py-1 rounded-full text-[8px] sm:text-[9px] font-bold uppercase tracking-widest transition-all",
                          mapProvider === 'osm' ? "bg-orange-500 text-black" : "text-app-muted hover:text-app-text"
                        )}
                      >
                        OSM
                      </button>
                      <button 
                        onClick={() => setMapProvider('google')}
                        className={cn(
                          "px-2 sm:px-2.5 py-1 rounded-full text-[8px] sm:text-[9px] font-bold uppercase tracking-widest transition-all",
                          mapProvider === 'google' ? "bg-orange-500 text-black" : "text-app-muted hover:text-app-text"
                        )}
                      >
                        GOOGLE
                      </button>
                    </div>
                  </div>
                </div>

                <div className="pointer-events-auto flex items-center gap-2 bg-app-bg/90 backdrop-blur-md p-1 px-2 sm:px-3 rounded-full border border-app-border shadow-lg">
                  <WeatherCard weather={weather} isLoading={isWeatherLoading} variant="minimal" />
                </div>
              </div>
              
              {gpsPoints.length > 0 ? (
                mapProvider === 'osm' ? (
                  <div className="w-full h-full relative">
                    {activePoint !== null && (
                      <button 
                        onClick={(e) => {
                          e.stopPropagation();
                          setIsPointLocked(false);
                          setActivePoint(null);
                        }}
                        className="absolute top-24 left-4 z-50 bg-app-bg/90 hover:bg-app-bg text-app-text p-2 rounded-full border border-app-border transition-all shadow-lg backdrop-blur-md"
                        title="Clear Highlight"
                      >
                        <CheckCircle2 className="w-4 h-4 text-orange-500" />
                      </button>
                    )}
                    <div className="absolute bottom-4 left-4 z-50 flex flex-col gap-2">
                      <div className="flex bg-app-bg/90 p-1 rounded-full border border-app-border backdrop-blur-md shadow-lg gap-1">
                        {(['roadmap', 'terrain'] as const).map((t) => (
                          <button
                            key={t}
                            onClick={() => setMapType(t as any)}
                            className={cn(
                              "px-3 py-1 rounded-full text-[8px] font-bold uppercase tracking-widest transition-all",
                              (t === 'roadmap' && mapType !== 'terrain') || (t === 'terrain' && mapType === 'terrain') ? "bg-orange-500 text-black" : "text-app-muted hover:text-app-text"
                            )}
                          >
                            {t === 'roadmap' ? 'STANDARD' : 'TERRAIN'}
                          </button>
                        ))}
                      </div>
                    </div>
                    <MapContainer key={`${gpsPoints[0][0]}-${gpsPoints[0][1]}`} center={gpsPoints[0]} zoom={13} scrollWheelZoom={true}>
                      <TileLayer
                        url={
                          mapType === 'terrain' 
                            ? "https://{s}.tile.opentopomap.org/{z}/{x}/{y}.png" 
                            : theme === 'dark'
                              ? "https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}.png"
                              : "https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}.png"
                        }
                        attribution={
                          mapType === 'terrain'
                            ? '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors, <a href="http://viewfinderpanoramas.org">SRTM</a> | Map style: &copy; <a href="https://opentopomap.org">OpenTopoMap</a> (<a href="https://creativecommons.org/licenses/by-sa/3.0/">CC-BY-SA</a>)'
                            : '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>'
                        }
                        maxZoom={19}
                      />
                      <LeafletPolyline 
                        positions={gpsPoints} 
                        color="#f97316" 
                        weight={4} 
                        opacity={0.8} 
                        eventHandlers={{
                          mousemove: (e) => {
                            if (isPointLocked || data.length === 0) return;
                            const { lat, lng } = e.latlng;
                            
                            // Efficient search: First find approximate area by subsampling
                            // Then search precisely within that area
                            let minDistance = Infinity;
                            let closestIndex = -1;
                            const step = Math.max(1, Math.floor(data.length / 200)); 
                            
                            // Step 1: Coarse search
                            for (let i = 0; i < data.length; i += step) {
                              const p = data[i];
                              if (p.latitude !== undefined && p.longitude !== undefined) {
                                const d = Math.pow(p.latitude - lat, 2) + Math.pow(p.longitude - lng, 2);
                                if (d < minDistance) {
                                  minDistance = d;
                                  closestIndex = i;
                                }
                              }
                            }
                            
                            // Step 2: Fine search around the candidate
                            if (closestIndex !== -1) {
                              const start = Math.max(0, closestIndex - step);
                              const end = Math.min(data.length - 1, closestIndex + step);
                              for (let i = start; i <= end; i++) {
                                const p = data[i];
                                if (p.latitude !== undefined && p.longitude !== undefined) {
                                  const d = Math.pow(p.latitude - lat, 2) + Math.pow(p.longitude - lng, 2);
                                  if (d < minDistance) {
                                    minDistance = d;
                                    closestIndex = i;
                                  }
                                }
                              }
                            }
                            
                            if (closestIndex !== -1) setActivePoint(closestIndex);
                          },
                          mouseout: () => {
                            if (!isPointLocked) setActivePoint(null);
                          },
                          click: (e) => {
                            const { lat, lng } = e.latlng;
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
                            
                            if (closestIndex !== -1) {
                              setActivePoint(closestIndex);
                              setIsPointLocked(true);
                            }
                          }
                        }}
                      />
                      {activePoint !== null && data[activePoint]?.latitude && data[activePoint]?.longitude && (
                        <CircleMarker 
                          center={[data[activePoint].latitude!, data[activePoint].longitude!]} 
                          radius={8} 
                          fillColor="#f97316" 
                          color="white" 
                          weight={3} 
                          fillOpacity={1} 
                        />
                      )}
                      <MapBounds points={gpsPoints} data={data} activePoint={activePoint} isPointLocked={isPointLocked} isMapMaximized={isMapMaximized} />
                    </MapContainer>
                  </div>
                ) : (
                  import.meta.env.VITE_GOOGLE_MAPS_API_KEY ? (
                    <APIProvider apiKey={import.meta.env.VITE_GOOGLE_MAPS_API_KEY}>
                      <div className="w-full h-full relative">
                        {activePoint !== null && (
                          <button 
                            onClick={(e) => {
                              e.stopPropagation();
                              setIsPointLocked(false);
                              setActivePoint(null);
                            }}
                            className="absolute top-24 left-4 z-50 bg-app-bg/90 hover:bg-app-bg text-app-text p-2 rounded-full border border-app-border transition-all shadow-lg backdrop-blur-md"
                            title="Clear Highlight"
                          >
                            <CheckCircle2 className="w-4 h-4 text-orange-500" />
                          </button>
                        )}
                        <div className="absolute bottom-4 left-4 z-50 flex flex-col gap-2">
                          <div className="flex bg-app-bg/90 p-1 rounded-full border border-app-border backdrop-blur-md shadow-lg gap-1">
                            {(['roadmap', 'satellite', 'terrain'] as const).map((t) => (
                              <button
                                key={t}
                                onClick={() => setMapType(t)}
                                className={cn(
                                  "px-3 py-1 rounded-full text-[8px] font-bold uppercase tracking-widest transition-all",
                                  mapType === t ? "bg-orange-500 text-black" : "text-app-muted hover:text-app-text"
                                )}
                              >
                                {t.toUpperCase()}
                              </button>
                            ))}
                          </div>
                          <div className="flex bg-app-bg/90 p-1 rounded-full border border-app-border backdrop-blur-md gap-1 shadow-lg">
                            <button
                              onClick={() => setShowTraffic(!showTraffic)}
                              className={cn(
                                "p-2 rounded-full transition-all",
                                showTraffic ? "bg-orange-500 text-black" : "text-app-muted hover:text-app-text"
                              )}
                              title="Traffic Layer"
                            >
                              <Car className="w-3.5 h-3.5" />
                            </button>
                            <button
                              onClick={() => setShowBicycling(!showBicycling)}
                              className={cn(
                                "p-2 rounded-full transition-all",
                                showBicycling ? "bg-orange-500 text-black" : "text-app-muted hover:text-app-text"
                              )}
                              title="Bicycling Layer"
                            >
                              <Bike className="w-3.5 h-3.5" />
                            </button>
                            <button
                              onClick={() => setShowTransit(!showTransit)}
                              className={cn(
                                "p-2 rounded-full transition-all",
                                showTransit ? "bg-orange-500 text-black" : "text-app-muted hover:text-app-text"
                              )}
                              title="Transit Layer"
                            >
                              <Bus className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>
                        <GoogleMap
                          ref={googleMapRef}
                          defaultCenter={{ lat: gpsPoints[0][0], lng: gpsPoints[0][1] }}
                          defaultZoom={13}
                          mapTypeId={mapType}
                          disableDefaultUI={true}
                          zoomControl={true}
                          zoomControlOptions={{ position: ControlPosition.RIGHT_BOTTOM }}
                          gestureHandling={'greedy'}
                          controlSize={24}
                          styles={theme === 'dark' ? [
                            { elementType: 'geometry', stylers: [{ color: '#242f3e' }] },
                            { elementType: 'labels.text.stroke', stylers: [{ color: '#242f3e' }] },
                            { elementType: 'labels.text.fill', stylers: [{ color: '#746855' }] },
                            {
                              featureType: 'administrative.locality',
                              elementType: 'labels.text.fill',
                              stylers: [{ color: '#d59563' }]
                            },
                            {
                              featureType: 'poi',
                              elementType: 'labels.text.fill',
                              stylers: [{ color: '#d59563' }]
                            },
                            {
                              featureType: 'poi.park',
                              elementType: 'geometry',
                              stylers: [{ color: '#263c3f' }]
                            },
                            {
                              featureType: 'poi.park',
                              elementType: 'labels.text.fill',
                              stylers: [{ color: '#6b9a76' }]
                            },
                            {
                              featureType: 'road',
                              elementType: 'geometry',
                              stylers: [{ color: '#38414e' }]
                            },
                            {
                              featureType: 'road',
                              elementType: 'geometry.stroke',
                              stylers: [{ color: '#212a37' }]
                            },
                            {
                              featureType: 'road',
                              elementType: 'labels.text.fill',
                              stylers: [{ color: '#9ca5b3' }]
                            },
                            {
                              featureType: 'road.highway',
                              elementType: 'geometry',
                              stylers: [{ color: '#746855' }]
                            },
                            {
                              featureType: 'road.highway',
                              elementType: 'geometry.stroke',
                              stylers: [{ color: '#1f2835' }]
                            },
                            {
                              featureType: 'road.highway',
                              elementType: 'labels.text.fill',
                              stylers: [{ color: '#f3d19c' }]
                            },
                            {
                              featureType: 'transit',
                              elementType: 'geometry',
                              stylers: [{ color: '#2f3948' }]
                            },
                            {
                              featureType: 'transit.station',
                              elementType: 'labels.text.fill',
                              stylers: [{ color: '#d59563' }]
                            },
                            {
                              featureType: 'water',
                              elementType: 'geometry',
                              stylers: [{ color: '#17263c' }]
                            },
                            {
                              featureType: 'water',
                              elementType: 'labels.text.fill',
                              stylers: [{ color: '#515c6d' }]
                            },
                            {
                              featureType: 'water',
                              elementType: 'labels.text.stroke',
                              stylers: [{ color: '#17263c' }]
                            }
                          ] : []}
                        >
                          <GoogleMapPolyline 
                            points={gpsPoints.map(p => ({ lat: p[0], lng: p[1] }))} 
                            data={data}
                            setActivePoint={setActivePoint}
                            setIsPointLocked={setIsPointLocked}
                            isMapMaximized={isMapMaximized}
                          />
                          <GoogleMapTrafficLayer enabled={showTraffic} />
                          <GoogleMapBicyclingLayer enabled={showBicycling} />
                          <GoogleMapTransitLayer enabled={showTransit} />
                        </GoogleMap>
                      </div>
                    </APIProvider>
                  ) : (
                    <div className="w-full h-full flex flex-col items-center justify-center bg-app-card/50 text-center p-8">
                      <MapIcon className="w-12 h-12 text-app-muted mb-4" />
                      <h3 className="text-lg font-bold mb-2">Google Maps API Key Missing</h3>
                      <p className="text-sm text-app-muted max-w-md">
                        Please provide a VITE_GOOGLE_MAPS_API_KEY in your environment variables to use Google Maps.
                        Falling back to OpenStreetMap.
                      </p>
                      <button 
                        onClick={() => setMapProvider('osm')}
                        className="mt-6 px-6 py-2 bg-orange-500 text-black rounded-full text-xs font-bold uppercase tracking-widest"
                      >
                        Use OpenStreetMap
                      </button>
                    </div>
                  )
                )
              ) : (
                <div className="w-full h-full flex flex-col items-center justify-center bg-app-card/30 text-center p-8">
                  <Navigation className="w-12 h-12 text-app-muted mb-4 animate-pulse" />
                  <h3 className="text-[10px] font-bold uppercase tracking-widest mb-2">NO GPS DATA</h3>
                  <p className="text-[10px] text-app-muted max-w-[200px]">This activity does not contain location coordinates for map visualization.</p>
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
});

ActivityMap.displayName = 'ActivityMap';
