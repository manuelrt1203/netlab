"use client";
import { useEffect } from "react";
import { MapContainer, TileLayer, Marker, Popup, useMap } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

// Fix default marker icons for Next.js
delete (L.Icon.Default.prototype as unknown as Record<string, unknown>)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png",
  iconUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png",
  shadowUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png",
});

function Recenter({ lat, lon }: { lat: number; lon: number }) {
  const map = useMap();
  useEffect(() => { map.setView([lat, lon], 11); }, [lat, lon, map]);
  return null;
}

export default function IpMap({ lat, lon, label }: { lat: number; lon: number; label: string }) {
  return (
    <MapContainer center={[lat, lon]} zoom={11} style={{ height: "100%", width: "100%", background: "#1a1d27" }}>
      {/* Les fonds CARTO exigent désormais une clé : tuiles OSM, assombries en CSS (globals.css) */}
      <TileLayer
        url="https://tile.openstreetmap.org/{z}/{x}/{y}.png"
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
        className="map-tiles-dark"
      />
      <Recenter lat={lat} lon={lon} />
      <Marker position={[lat, lon]}>
        <Popup>{label}</Popup>
      </Marker>
    </MapContainer>
  );
}
