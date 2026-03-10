"use client";

import "leaflet/dist/leaflet.css";
import { useEffect, useState } from "react";

type JobMapProps = {
  /** Full address string to geocode and show on map */
  address: string;
  /** Optional title for the marker popup */
  title?: string;
  /** Height of the map container (default 240) */
  height?: number;
};

type NominatimResult = {
  lat: string;
  lon: string;
  display_name?: string;
};

export function JobMap({ address, title, height = 240 }: JobMapProps) {
  const [coords, setCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [MapContent, setMapContent] = useState<React.ComponentType<{ center: [number, number]; title?: string }> | null>(null);

  useEffect(() => {
    if (!address.trim()) return;

    setError(null);
    const q = encodeURIComponent(address.trim());
    fetch(
      `https://nominatim.openstreetmap.org/search?q=${q}&format=json&limit=1`,
      {
        headers: {
          Accept: "application/json",
          "User-Agent": "TommyDsJobMap/1.0 (field service job map)",
        },
      }
    )
      .then((res) => res.json())
      .then((data: NominatimResult[]) => {
        if (data && data[0]) {
          setCoords({ lat: Number.parseFloat(data[0].lat), lng: Number.parseFloat(data[0].lon) });
        } else {
          setError("Map couldn’t be loaded for this address. Use “Open in Maps” above for directions.");
        }
      })
      .catch(() => setError("Could not load map"));
  }, [address]);

  useEffect(() => {
    if (typeof window === "undefined" || !coords) return;
    Promise.all([import("react-leaflet"), import("leaflet")]).then(([{ MapContainer, TileLayer, Marker, Popup }, L]) => {
      if (L.Icon?.Default) {
        delete (L.Icon.Default.prototype as unknown as { _getIconUrl?: unknown })._getIconUrl;
        L.Icon.Default.mergeOptions({
          iconRetinaUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png",
          iconUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png",
          shadowUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png",
        });
      }
      setMapContent(function MapContent({ center, title: popupTitle }: { center: [number, number]; title?: string }) {
        return (
          <MapContainer
            center={center}
            zoom={15}
            style={{ height: "100%", width: "100%", borderRadius: 8 }}
            scrollWheelZoom={false}
          >
            <TileLayer
              attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            />
            <Marker position={center}>
              {popupTitle && <Popup>{popupTitle}</Popup>}
            </Marker>
          </MapContainer>
        );
      });
    }).catch(() => setError("Could not load map"));
  }, [coords]);

  if (error) {
    return (
      <div className="rounded-lg border border-border bg-muted/30 p-4 text-sm text-muted-foreground" style={{ minHeight: height }}>
        <p>{error}</p>
        {address.trim() ? (
          <p className="mt-2 text-xs opacity-90">Address: {address.trim()}</p>
        ) : null}
      </div>
    );
  }

  if (!coords || !MapContent) {
    return (
      <div className="rounded-lg border border-border bg-muted/30 flex items-center justify-center text-sm text-muted-foreground" style={{ height }}>
        Loading map…
      </div>
    );
  }

  return (
    <div className="rounded-lg border border-border overflow-hidden bg-muted/30" style={{ height }}>
      <MapContent center={[coords.lat, coords.lng]} title={title} />
    </div>
  );
}
