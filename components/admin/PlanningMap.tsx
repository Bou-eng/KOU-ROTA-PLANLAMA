"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import type { LatLngExpression, LatLngTuple } from "leaflet";
import L from "leaflet";
import {
  MapContainer,
  Marker,
  Polyline,
  TileLayer,
  useMap,
} from "react-leaflet";
import markerIcon2x from "leaflet/dist/images/marker-icon-2x.png";
import markerIcon from "leaflet/dist/images/marker-icon.png";
import markerShadow from "leaflet/dist/images/marker-shadow.png";

// Fix default marker assets path for Next.js bundling
L.Icon.Default.mergeOptions({
  iconRetinaUrl: (markerIcon2x as unknown as string) || undefined,
  iconUrl: (markerIcon as unknown as string) || undefined,
  shadowUrl: (markerShadow as unknown as string) || undefined,
});

const MAP_COLORS = [
  "#34d399",
  "#22d3ee",
  "#fbbf24",
  "#a78bfa",
  "#f472b6",
  "#fb7185",
];

const DEFAULT_CENTER: LatLngExpression = [39.0, 35.0];

export type PlanningStop = {
  station_id: number;
  station_name: string;
  demand_kg: number;
  cargo_count: number;
};

export type PlanningVehicle = {
  vehicle_id: string;
  capacity_kg: number;
  is_rental: boolean;
  load_kg: number;
  stops: PlanningStop[];
  total_km: number;
  total_cost: number;
};

export type PlanningResponse = {
  date: string;
  center_station: { id: number; name: string };
  km_unit_cost: number;
  rental_fixed_cost: number;
  vehicles: PlanningVehicle[];
  total_cost: number;
  total_km: number;
  total_load_kg: number;
  unserved_stations: Array<{
    station_id: number;
    station_name: string;
    demand_kg: number;
  }>;
};

interface Station {
  id: number;
  name: string;
  lat: number;
  lon: number;
  is_active?: boolean;
}

interface PolylineData {
  id: string;
  color: string;
  points: LatLngTuple[];
}

function FitBounds({ bounds }: { bounds: L.LatLngBounds | null }) {
  const map = useMap();

  useEffect(() => {
    if (bounds) {
      map.fitBounds(bounds, { padding: [24, 24] });
    }
  }, [bounds, map]);

  return null;
}

function LoadingOverlay({ text }: { text: string }) {
  return (
    <div className="pointer-events-none absolute inset-0 z-20 grid place-items-center bg-slate-950/60 text-white/80 text-sm">
      {text}
    </div>
  );
}

export default function PlanningMap({
  planning,
}: {
  planning: PlanningResponse | null;
}) {
  const [stations, setStations] = useState<Station[]>([]);
  const [polylines, setPolylines] = useState<PolylineData[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  const apiBase = useMemo(
    () =>
      (process.env.NEXT_PUBLIC_API_URL || "http://127.0.0.1:8000").replace(
        /\/$/,
        ""
      ),
    []
  );

  useEffect(() => {
    if (!planning) {
      setStations([]);
      setPolylines([]);
      setError(null);
      return;
    }

    // Cancel previous requests
    if (abortRef.current) {
      abortRef.current.abort();
    }
    const controller = new AbortController();
    abortRef.current = controller;

    async function fetchStations(): Promise<Station[]> {
      const response = await fetch(`${apiBase}/stations`, {
        method: "GET",
        signal: controller.signal,
      });
      if (!response.ok) {
        const detail = await response
          .json()
          .catch(() => ({} as { detail?: string }));
        throw new Error((detail.detail as string) || "İstasyonlar alınamadı.");
      }
      return response.json() as Promise<Station[]>;
    }

    async function expandRoute(stationIds: number[]): Promise<number[]> {
      const response = await fetch(`${apiBase}/graph/expand-route`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ station_ids: stationIds }),
        signal: controller.signal,
      });

      if (!response.ok) {
        const detail = await response
          .json()
          .catch(() => ({} as { detail?: string }));
        throw new Error((detail.detail as string) || "Rota genişletilemiyor.");
      }

      const payload = (await response.json()) as {
        expanded_station_ids: number[];
      };
      return payload.expanded_station_ids || [];
    }

    async function buildRoutes() {
      setLoading(true);
      setError(null);
      setPolylines([]);

      try {
        const stationList = await fetchStations();
        const stationMap = new Map<number, Station>();
        stationList.forEach((st) => stationMap.set(st.id, st));

        let hasError = false;
        const routes: PolylineData[] = [];
        const routeErrors: string[] = [];

        if (planning) {
          for (let vIdx = 0; vIdx < (planning.vehicles || []).length; vIdx++) {
            const vehicle = planning.vehicles[vIdx];
            const stops = vehicle?.stops || [];
            if (!stops.length) continue;

            try {
              // Get base route (stops are the actual delivery points)
              const stationIds = stops.map((s) => s.station_id);

              // Expand route using backend endpoint
              const expandedIds = await expandRoute(stationIds);

              // Convert expanded IDs to coordinates
              const points: LatLngTuple[] = [];
              for (const sid of expandedIds) {
                const st = stationMap.get(sid);
                if (st) {
                  const coord: LatLngTuple = [st.lat, st.lon];
                  // Avoid duplicate consecutive points
                  const last = points[points.length - 1];
                  if (!last || last[0] !== coord[0] || last[1] !== coord[1]) {
                    points.push(coord);
                  }
                }
              }

              if (points.length > 1) {
                routes.push({
                  id: vehicle.vehicle_id || `vehicle-${vIdx + 1}`,
                  color: MAP_COLORS[vIdx % MAP_COLORS.length],
                  points,
                });
              }
            } catch {
              if (controller.signal.aborted) return;
              hasError = true;
              const vehicleName = vehicle.vehicle_id || `Araç ${vIdx + 1}`;
              routeErrors.push(`${vehicleName}: Rota hesaplanamadı`);
              continue;
            }
          }
        }

        setStations(stationList);
        setPolylines(routes);
        if (hasError && routeErrors.length > 0) {
          setError(
            `Bu rota için bazı istasyonlar arasında yol bulunamadı. Lütfen km bağlantılarını kontrol edin. (${routeErrors.join(
              ", "
            )})`
          );
        }
      } catch {
        if (controller.signal.aborted) return;
        setError(
          "Bu rota için bazı istasyonlar arasında yol bulunamadı. Lütfen km bağlantılarını kontrol edin."
        );
      } finally {
        if (!controller.signal.aborted) {
          setLoading(false);
        }
      }
    }

    buildRoutes();

    return () => {
      controller.abort();
    };
  }, [planning, apiBase]);

  const bounds = useMemo(() => {
    const allPoints: LatLngTuple[] = [];
    polylines.forEach((p) => allPoints.push(...p.points));

    if (allPoints.length === 0) {
      const firstActive = stations.find((s) => s.lat && s.lon);
      if (firstActive) {
        return L.latLngBounds([[firstActive.lat, firstActive.lon]]);
      }
      return null;
    }

    return L.latLngBounds(allPoints);
  }, [polylines, stations]);

  const center = bounds ? bounds.getCenter() : DEFAULT_CENTER;

  return (
    <div className="relative aspect-video rounded-xl border border-white/10 bg-slate-900 overflow-hidden">
      {error && (
        <div className="absolute inset-x-4 top-4 z-20 rounded-lg border border-amber-400/40 bg-amber-500/15 px-4 py-3 text-sm text-amber-100 shadow-lg">
          {error}
        </div>
      )}

      {planning ? (
        <MapContainer
          key={planning.date || "planning-map"}
          center={center as LatLngExpression}
          zoom={6}
          className="h-full w-full"
          scrollWheelZoom={true}
          zoomControl={false}
          attributionControl={false}
        >
          <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />

          {polylines.map((line) => (
            <Polyline
              key={line.id}
              positions={line.points}
              pathOptions={{ color: line.color, weight: 4, opacity: 0.85 }}
            />
          ))}

          {stations.map((station) => (
            <Marker key={station.id} position={[station.lat, station.lon]} />
          ))}

          {bounds && <FitBounds bounds={bounds} />}
        </MapContainer>
      ) : (
        <div className="absolute inset-0 grid place-items-center text-white/60 text-sm">
          Planlama sonucu bulunamadı.
        </div>
      )}

      {loading && <LoadingOverlay text="Rotalar yükleniyor..." />}
    </div>
  );
}
