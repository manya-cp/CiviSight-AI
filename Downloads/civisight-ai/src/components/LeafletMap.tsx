import React, { useEffect, useRef } from 'react';
import L from 'leaflet';

export interface MapMarkerItem {
  id: string;
  title: string;
  subtitle?: string;
  latitude: number;
  longitude: number;
  severity?: 'Low' | 'Moderate' | 'High' | 'Critical';
  rippleScore?: number;
}

interface LeafletMapProps {
  markers?: MapMarkerItem[];
  center?: [number, number];
  zoom?: number;
  interactivePick?: boolean;
  pickedCoords?: { lat: number; lng: number } | null;
  onPickCoords?: (coords: { lat: number; lng: number }) => void;
  heightClass?: string;
}

const SEVERITY_COLORS: Record<string, string> = {
  Critical: '#f43f5e',
  High: '#f59e0b',
  Moderate: '#38bdf8',
  Low: '#10b981',
};

export const LeafletMap: React.FC<LeafletMapProps> = ({
  markers = [],
  center = [37.7845, -122.4045],
  zoom = 13,
  interactivePick = false,
  pickedCoords = null,
  onPickCoords,
  heightClass = 'h-72',
}) => {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<L.Map | null>(null);
  const layerGroupRef = useRef<L.LayerGroup | null>(null);

  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;

    const map = L.map(containerRef.current, {
      center,
      zoom,
      zoomControl: true,
    });

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '&copy; OpenStreetMap contributors',
      maxZoom: 19,
    }).addTo(map);

    const group = L.layerGroup().addTo(map);
    mapRef.current = map;
    layerGroupRef.current = group;

    if (interactivePick && onPickCoords) {
      map.on('click', (ev: L.LeafletMouseEvent) => {
        onPickCoords({
          lat: Number(ev.latlng.lat.toFixed(6)),
          lng: Number(ev.latlng.lng.toFixed(6)),
        });
      });
    }

    return () => {
      map.remove();
      mapRef.current = null;
      layerGroupRef.current = null;
    };
  }, []);

  useEffect(() => {
    const map = mapRef.current;
    const group = layerGroupRef.current;
    if (!map || !group) return;

    group.clearLayers();

    if (pickedCoords) {
      L.circleMarker([pickedCoords.lat, pickedCoords.lng], {
        radius: 9,
        color: '#22d3ee',
        fillColor: '#0ea5e9',
        fillOpacity: 0.85,
        weight: 2,
      })
        .bindPopup(`Selected site (${pickedCoords.lat.toFixed(4)}, ${pickedCoords.lng.toFixed(4)})`)
        .addTo(group);
      map.setView([pickedCoords.lat, pickedCoords.lng], Math.max(map.getZoom(), 14));
    }

    const validMarkers = markers.filter(
      (m) => Number.isFinite(m.latitude) && Number.isFinite(m.longitude)
    );

    validMarkers.forEach((item) => {
      const color = SEVERITY_COLORS[item.severity || 'Moderate'] || '#38bdf8';
      const marker = L.circleMarker([item.latitude, item.longitude], {
        radius: 8,
        color: '#ffffff',
        fillColor: color,
        fillOpacity: 0.9,
        weight: 2,
      });

      const popupDiv = document.createElement('div');
      popupDiv.className = 'text-xs space-y-1';
      const strong = document.createElement('div');
      strong.className = 'font-semibold text-white';
      strong.textContent = item.title;
      popupDiv.appendChild(strong);

      if (item.subtitle) {
        const sub = document.createElement('div');
        sub.className = 'text-slate-300';
        sub.textContent = item.subtitle;
        popupDiv.appendChild(sub);
      }

      if (typeof item.rippleScore === 'number') {
        const score = document.createElement('div');
        score.className = 'text-cyan-300 font-mono';
        score.textContent = `Ripple Score: ${item.rippleScore}/100`;
        popupDiv.appendChild(score);
      }

      marker.bindPopup(popupDiv).addTo(group);
    });

    if (!pickedCoords && validMarkers.length > 0) {
      const bounds = L.latLngBounds(validMarkers.map((m) => [m.latitude, m.longitude] as [number, number]));
      if (validMarkers.length === 1) {
        map.setView([validMarkers[0].latitude, validMarkers[0].longitude], 14);
      } else {
        map.fitBounds(bounds, { padding: [36, 36], maxZoom: 15 });
      }
    }
  }, [markers, pickedCoords]);

  return (
    <div
      ref={containerRef}
      className={`w-full ${heightClass} rounded-xl overflow-hidden border border-white/15`}
    />
  );
};
