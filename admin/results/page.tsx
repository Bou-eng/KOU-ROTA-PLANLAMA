"use client";

import React, { useEffect, useState } from "react";
import dynamic from "next/dynamic";
import AdminLayout from "@/components/admin/AdminLayout";
import { apiGet } from "@/lib/api";
import { vehicleDisplayName } from "@/lib/format";
import { useSearchParams } from "next/navigation";

const PlanningMap = dynamic(() => import("@/components/admin/PlanningMap"), {
  ssr: false,
});

interface LastResultResponse {
  total_cost: number;
  total_distance_km: number;
  total_load_kg: number;
  vehicle_count: number;
  vehicles: Array<{
    name: string;
    capacity_kg: number;
    distance_km: number;
    load_kg: number;
    cost: number;
    stop_count: number;
    route_station_names: string[];
  }>;
}

type PlanningStop = {
  station_id: number;
  station_name: string;
  demand_kg: number;
  cargo_count: number;
};
type PlanningVehicle = {
  vehicle_id: string;
  capacity_kg: number;
  is_rental: boolean;
  load_kg: number;
  stops: PlanningStop[];
  total_km: number;
  total_cost: number;
};
type PlanningResponse = {
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

export default function ResultsPage() {
  const [selectedVehicle, setSelectedVehicle] = useState<number | null>(null);
  const [planningData, setPlanningData] = useState<PlanningResponse | null>(
    null
  );
  const [data, setData] = useState<LastResultResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const searchParams = useSearchParams();

  useEffect(() => {
    let mounted = true;

    async function loadResult() {
      try {
        setLoading(true);
        setError(null);
        // Prefer run_id from URL (?run_id=) or localStorage
        const qpId = searchParams.get("run_id");
        const lsId =
          typeof window !== "undefined"
            ? window.localStorage.getItem("planning_selected_run_id")
            : null;
        const runId = qpId || lsId;

        if (!runId) {
          throw new Error("Seçilen planlama bulunamadı.");
        }

        const response = await apiGet<PlanningResponse>(
          `/planning/runs/${runId}`
        );
        if (!mounted) return;

        setPlanningData(response);

        // Map PlanningResponse -> LastResultResponse UI shape
        const vehicles = (response.vehicles || []).map((veh, idx) => {
          const stops = veh.stops || [];
          return {
            name: vehicleDisplayName(veh.vehicle_id, {
              index: idx + 1,
              isRental: veh.is_rental,
            }),
            capacity_kg: veh.capacity_kg,
            distance_km: veh.total_km,
            load_kg: veh.load_kg,
            cost: veh.total_cost,
            stop_count: stops.length,
            route_station_names: stops.map((s) => s.station_name),
          };
        });

        const mapped: LastResultResponse = {
          total_cost: response.total_cost || 0,
          total_distance_km: response.total_km || 0,
          total_load_kg: response.total_load_kg || 0,
          vehicle_count: vehicles.length,
          vehicles,
        };

        setData(mapped);
        setSelectedVehicle(null);
      } catch (err: any) {
        if (!mounted) return;
        setError(err?.message || "Planlama sonucu alınamadı.");
        setData(null);
        setPlanningData(null);
      } finally {
        if (mounted) setLoading(false);
      }
    }

    loadResult();

    return () => {
      mounted = false;
    };
  }, []);

  const vehicles = data?.vehicles || [];
  const totalCost = data?.total_cost ?? 0;
  const totalKm = data?.total_distance_km ?? 0;
  const totalWeight = data?.total_load_kg ?? 0;
  const vehicleCount = data?.vehicle_count ?? vehicles.length;
  const vehicleDetail =
    selectedVehicle !== null ? vehicles[selectedVehicle] : null;

  return (
    <AdminLayout>
      <div className="space-y-6">
        {/* Page title */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-white">
              Planlama Sonuçları
            </h1>
            <p className="mt-2 text-sm text-white/70">
              Seçilen planlama sonucu
            </p>
          </div>
          <div className="rounded-xl border border-emerald-400/30 bg-emerald-500/10 px-4 py-2">
            <div className="text-xs text-emerald-300/80">Toplam Maliyet</div>
            <div className="text-2xl font-bold text-emerald-300">
              ₺{Math.round(totalCost)}
            </div>
          </div>
        </div>

        {/* Summary cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="rounded-2xl border border-white/20 bg-white/10 backdrop-blur-md p-4 shadow-xl">
            <div className="text-sm text-white/70">Toplam Mesafe</div>
            <div className="text-2xl font-bold text-white">
              {totalKm.toFixed(1)} km
            </div>
          </div>
          <div className="rounded-2xl border border-white/20 bg-white/10 backdrop-blur-md p-4 shadow-xl">
            <div className="text-sm text-white/70">Toplam Yük</div>
            <div className="text-2xl font-bold text-white">
              {Math.round(totalWeight)} kg
            </div>
          </div>
          <div className="rounded-2xl border border-white/20 bg-white/10 backdrop-blur-md p-4 shadow-xl">
            <div className="text-sm text-white/70">Araç Sayısı</div>
            <div className="text-2xl font-bold text-white">{vehicleCount}</div>
          </div>
        </div>

        {/* Status state */}
        {loading && (
          <div className="rounded-xl border border-white/10 bg-white/5 p-4 text-white/70">
            Planlama sonucu yükleniyor...
          </div>
        )}

        {!loading && error && (
          <div className="rounded-xl border border-red-500/30 bg-red-500/10 p-4 text-sm text-red-100">
            {error}
          </div>
        )}

        {!loading && !error && vehicles.length === 0 && (
          <div className="rounded-xl border border-white/10 bg-white/5 p-4 text-white/70">
            Henüz planlama sonucu yok.
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Map placeholder */}
          <div className="lg:col-span-2">
            <div className="rounded-2xl border border-white/20 bg-white/10 backdrop-blur-md p-6 shadow-xl">
              <h2 className="text-xl font-bold text-white mb-4">
                Harita Görünümü
              </h2>
              <PlanningMap planning={planningData} />
            </div>
          </div>

          {/* Vehicles panel */}
          <div className="lg:col-span-1">
            <div className="rounded-2xl border border-white/20 bg-white/10 backdrop-blur-md shadow-xl overflow-hidden">
              <div className="p-4 border-b border-white/10">
                <h2 className="text-lg font-bold text-white">Araçlar</h2>
              </div>
              <div className="p-4 space-y-3 max-h-[600px] overflow-y-auto">
                {loading && (
                  <div className="text-sm text-white/60">Yükleniyor...</div>
                )}

                {!loading && !error && vehicles.length === 0 && (
                  <div className="text-sm text-white/60">Araç bulunamadı.</div>
                )}

                {!loading &&
                  !error &&
                  vehicles.map((vehicle, idx) => (
                    <div
                      key={`${vehicle.name}-${idx}`}
                      className="rounded-xl border border-white/10 bg-white/5 p-4 hover:bg-white/10 transition-colors"
                    >
                      <div className="flex items-start justify-between mb-3">
                        <h3 className="font-semibold text-white text-sm">
                          {vehicleDisplayName(vehicle.name, { index: idx + 1 })}
                        </h3>
                        <span className="text-xs bg-emerald-500/20 text-emerald-300 px-2 py-1 rounded">
                          {vehicle.stop_count} durak
                        </span>
                      </div>
                      <div className="grid grid-cols-2 gap-2 text-xs text-white/70 mb-3">
                        <div>
                          <span className="block text-white/50">Mesafe</span>
                          <span className="text-white font-medium">
                            {vehicle.distance_km.toFixed(1)} km
                          </span>
                        </div>
                        <div>
                          <span className="block text-white/50">Yük</span>
                          <span className="text-white font-medium">
                            {Math.round(vehicle.load_kg)} kg
                          </span>
                        </div>
                        <div className="col-span-2">
                          <span className="block text-white/50">Maliyet</span>
                          <span className="text-emerald-300 font-bold">
                            ₺{Math.round(vehicle.cost)}
                          </span>
                        </div>
                      </div>
                      {vehicle.route_station_names.length > 0 && (
                        <div className="text-xs text-white/60 mb-3 line-clamp-2">
                          {vehicle.route_station_names.join(" → ")}
                        </div>
                      )}
                      <button
                        onClick={() => setSelectedVehicle(idx)}
                        className="w-full text-xs text-cyan-400 hover:text-cyan-300 font-medium transition-colors"
                      >
                        Detay →
                      </button>
                    </div>
                  ))}
              </div>
            </div>
          </div>
        </div>

        {/* Vehicle detail modal */}
        {vehicleDetail && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
            <div className="relative max-w-2xl w-full mx-4 rounded-2xl border border-white/20 bg-slate-900/95 backdrop-blur-md shadow-2xl overflow-hidden">
              <div className="p-6 border-b border-white/10 flex items-center justify-between">
                <h2 className="text-xl font-bold text-white">
                  {vehicleDisplayName(vehicleDetail.name, {
                    index: (selectedVehicle ?? 0) + 1,
                  })}
                </h2>
                <button
                  onClick={() => setSelectedVehicle(null)}
                  className="text-white/70 hover:text-white transition-colors"
                >
                  <svg
                    viewBox="0 0 24 24"
                    className="h-6 w-6"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                  >
                    <path
                      d="M6 18L18 6M6 6l12 12"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                </button>
              </div>
              <div className="p-6">
                <h3 className="text-lg font-semibold text-white mb-4">
                  Durak Sırası
                </h3>
                <div className="max-h-[320px] md:max-h-[420px] overflow-y-auto pr-2 space-y-3">
                  {vehicleDetail.route_station_names.map((station, idx) => (
                    <div
                      key={`${station}-${idx}`}
                      className="relative rounded-xl border border-white/10 bg-white/5 p-4"
                    >
                      <div className="absolute -left-3 -top-3 h-8 w-8 rounded-full bg-gradient-to-br from-cyan-500 to-blue-500 flex items-center justify-center text-white font-bold text-sm shadow-lg">
                        {idx + 1}
                      </div>
                      <div className="ml-4">
                        <h4 className="font-semibold text-white text-sm">
                          {station}
                        </h4>
                        <div className="flex gap-4 text-xs text-white/60 mt-1">
                          <span>
                            {vehicleDisplayName(vehicleDetail.name, {
                              index: (selectedVehicle ?? 0) + 1,
                            })}
                          </span>
                          <span>•</span>
                          <span>
                            {Math.round(vehicleDetail.load_kg)} kg taşıma
                          </span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </AdminLayout>
  );
}
