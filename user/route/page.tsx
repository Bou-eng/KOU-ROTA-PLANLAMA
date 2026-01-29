"use client";

import React, { useEffect, useMemo, useState } from "react";
import dynamic from "next/dynamic";
import UserLayout from "@/components/user/UserLayout";
import { apiGet } from "@/lib/api";

const UserRouteMap = dynamic(() => import("@/components/user/UserRouteMap"), {
  ssr: false,
  loading: () => (
    <div className="aspect-video rounded-xl border border-white/10 bg-slate-900 flex items-center justify-center text-white/60 text-sm">
      Harita yükleniyor...
    </div>
  ),
});

interface UserRouteStop {
  order: number;
  station_id: number;
  station_name: string;
  total_piece: number;
  total_kg: number;
  eta_time?: string | null;
}

interface UserRouteResponse {
  date: string;
  summary: {
    total_distance_km: number;
    total_kg: number;
    total_piece: number;
    stop_count: number;
  };
  stops: UserRouteStop[];
  map: {
    center: { lat: number; lon: number };
    markers: Array<{
      station_id: number;
      name: string;
      lat: number;
      lon: number;
      order: number;
    }>;
    polylines: Array<{ vehicle_label: string; station_ids: number[] }>;
  };
  message?: string | null;
}

export default function MyRoutePage() {
  const [data, setData] = useState<UserRouteResponse | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const defaultDate = useMemo(() => {
    const d = new Date();
    d.setDate(d.getDate() + 1);
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(
      2,
      "0"
    )}-${String(d.getDate()).padStart(2, "0")}`;
  }, []);

  useEffect(() => {
    async function loadRoute() {
      setLoading(true);
      setError(null);
      try {
        const email =
          typeof window !== "undefined"
            ? localStorage.getItem("user_email") ||
              localStorage.getItem("email") ||
              ""
            : "";
        if (!email) {
          setError("Kullanıcı bilgisi bulunamadı. Lütfen tekrar giriş yapın.");
          setData(null);
          return;
        }
        const payload = await apiGet<UserRouteResponse>(
          `/user/route?date=${defaultDate}`,
          undefined,
          {
            "X-User-Email": email,
          }
        );
        setData(payload);
      } catch (err) {
        const message =
          err instanceof Error ? err.message : "Rota yüklenemedi.";
        setError(message);
        setData(null);
      } finally {
        setLoading(false);
      }
    }

    loadRoute();
  }, [defaultDate]);

  const hasRoute = !!(data && data.stops && data.stops.length > 0);

  const formatDate = (iso: string) => {
    const d = new Date(iso);
    return `${String(d.getDate()).padStart(2, "0")}.${String(
      d.getMonth() + 1
    ).padStart(2, "0")}.${d.getFullYear()}`;
  };

  return (
    <UserLayout>
      <div className="space-y-6">
        {/* Page title */}
        <div>
          <h1 className="text-3xl font-bold text-white">Rotam</h1>
          <p className="mt-2 text-sm text-white/70">
            {hasRoute
              ? "Planlanan rota ve duraklar aşağıda listelenmektedir."
              : "Bu tarih için planlanmış rotanız yok."}
          </p>
          {error && (
            <div className="mt-3 rounded-xl border border-amber-400/30 bg-amber-500/10 px-4 py-3 text-amber-200 text-sm">
              {error}
            </div>
          )}
        </div>

        {!hasRoute ? (
          /* Empty state */
          <div className="rounded-2xl border border-white/20 bg-white/10 backdrop-blur-md p-12 shadow-xl text-center">
            <svg
              viewBox="0 0 24 24"
              className="mx-auto h-16 w-16 text-white/30 mb-4"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.5"
            >
              <path
                d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
            <h3 className="text-xl font-semibold text-white mb-2">
              Bu Tarih İçin Rotanız Yok
            </h3>
            <p className="text-white/70 max-w-md mx-auto">
              Planlama yapıldığında ve talepleriniz bir rotaya dahil edildiğinde
              burada görünecektir.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Map */}
            <div className="lg:col-span-2">
              <div className="rounded-2xl border border-white/20 bg-white/10 backdrop-blur-md p-6 shadow-xl">
                <h2 className="text-xl font-bold text-white mb-4">
                  Harita Görünümü
                </h2>
                <UserRouteMap mapData={data?.map || null} />
              </div>
            </div>

            {/* Sidebar - Stops and Summary */}
            <div className="lg:col-span-1 space-y-6">
              {/* Summary card */}
              <div className="rounded-2xl border border-white/20 bg-white/10 backdrop-blur-md p-6 shadow-xl">
                <h2 className="text-lg font-bold text-white mb-4">Özet</h2>
                <div className="space-y-3">
                  <div className="flex justify-between">
                    <span className="text-sm text-white/70">Tarih</span>
                    <span className="text-sm font-semibold text-white">
                      {data ? formatDate(data.date) : "-"}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-white/70">Toplam Mesafe</span>
                    <span className="text-sm font-semibold text-cyan-400">
                      {data?.summary.total_distance_km?.toFixed(2)} km
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-white/70">
                      Toplam Ağırlık
                    </span>
                    <span className="text-sm font-semibold text-white">
                      {Math.round(data?.summary.total_kg || 0)} kg
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-white/70">Toplam Kargo</span>
                    <span className="text-sm font-semibold text-white">
                      {data?.summary.total_piece} adet
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-white/70">Durak Sayısı</span>
                    <span className="text-sm font-semibold text-white">
                      {data?.summary.stop_count}
                    </span>
                  </div>
                </div>
              </div>

              {/* Stops list */}
              <div className="rounded-2xl border border-white/20 bg-white/10 backdrop-blur-md p-6 shadow-xl">
                <h2 className="text-lg font-bold text-white mb-4">
                  Durak Sırası
                </h2>
                <div className="max-h-[320px] md:max-h-[420px] overflow-y-auto pr-2 space-y-3">
                  {data?.stops.map((stop, idx) => (
                    <div
                      key={`stop-${idx}-${stop.station_id}-${stop.order}`}
                      className="relative"
                    >
                      {idx !== (data?.stops.length || 0) - 1 && (
                        <div className="absolute left-4 top-10 bottom-0 w-0.5 bg-gradient-to-b from-cyan-400/50 to-transparent"></div>
                      )}
                      <div className="relative rounded-xl border border-white/10 bg-white/5 p-4 hover:bg-white/10 transition-colors">
                        <div className="absolute -left-2 -top-2 h-8 w-8 rounded-full bg-gradient-to-br from-cyan-500 to-blue-500 flex items-center justify-center text-white font-bold text-sm shadow-lg">
                          {stop.order}
                        </div>
                        <div className="ml-4">
                          <div className="flex items-start justify-between mb-2">
                            <h3 className="font-semibold text-white text-sm">
                              {stop.station_name}
                            </h3>
                            {stop.eta_time && (
                              <span className="text-xs text-white/70 bg-white/10 px-2 py-1 rounded">
                                {stop.eta_time}
                              </span>
                            )}
                          </div>
                          <div className="flex gap-4 text-xs text-white/60">
                            <span>{stop.total_piece} kargo</span>
                            <span>•</span>
                            <span>{Math.round(stop.total_kg)} kg</span>
                          </div>
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
    </UserLayout>
  );
}
