"use client";

import React, { useState } from "react";
import AdminLayout from "@/components/admin/AdminLayout";
import { apiPost } from "@/lib/api";
import { vehicleDisplayName } from "@/lib/format";

interface PlanningResult {
  id?: number; // DB record ID after save
  date: string;
  center_station: { id: number; name: string };
  km_unit_cost: number;
  rental_fixed_cost: number;
  vehicles: Array<{
    vehicle_id: string;
    capacity_kg: number;
    is_rental: boolean;
    load_kg: number;
    stops: Array<{
      station_id: number;
      station_name: string;
      demand_kg: number;
      cargo_count: number;
    }>;
    total_km: number;
    total_cost: number;
  }>;
  total_cost: number;
  total_km: number;
  total_load_kg: number;
  unserved_stations: Array<{
    station_id: number;
    station_name: string;
    demand_kg: number;
  }>;
}

export default function PlanningPage() {
  const [mode, setMode] = useState<"unlimited" | "limited">("unlimited");
  const [kmCost, setKmCost] = useState("2.5");
  const [cap500, setCap500] = useState("500");
  const [cap750, setCap750] = useState("750");
  const [cap1000, setCap1000] = useState("1000");
  const [rentalCap, setRentalCap] = useState("500");
  const [rentalCost, setRentalCost] = useState("200");
  const [selectedDate, setSelectedDate] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<PlanningResult | null>(null);
  const [alert, setAlert] = useState<{
    type: "success" | "error";
    message: string;
  } | null>(null);

  // Initialize date to tomorrow on mount
  React.useEffect(() => {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    const isoDate = tomorrow.toISOString().split("T")[0];
    setSelectedDate(isoDate);
  }, []);

  const handleStartPlanning = async () => {
    setAlert(null);
    setLoading(true);

    try {
      const requestBody = {
        mode: mode === "unlimited" ? "UNLIMITED_MIN_COST" : "FIXED_3_MAX_CARGO",
        km_unit_cost: parseFloat(kmCost),
        vehicle_capacities: [
          parseInt(cap1000),
          parseInt(cap750),
          parseInt(cap500),
        ],
        rental_capacity: parseInt(rentalCap),
        rental_fixed_cost: parseInt(rentalCost),
        date: selectedDate || null,
      };

      const planningResult = await apiPost<PlanningResult>(
        "/planning/run",
        requestBody
      );

      setResult(planningResult);

      // Save the planning run ID to localStorage for results page
      if (planningResult.id) {
        try {
          window.localStorage.setItem(
            "planning_selected_run_id",
            String(planningResult.id)
          );
        } catch {}
      }

      setAlert({
        type: "success",
        message: "Planlama başarılı oldu. Sonuçlar aşağıda gösterilmektedir.",
      });
    } catch (err: unknown) {
      const error = err as Error;
      const message = error.message || "Planlama sırasında bir hata oluştu.";

      // Friendly message for no demands
      if (message.includes("talep bulunamadı") || message.includes("PENDING")) {
        setAlert({
          type: "error",
          message: "Seçilen tarihte planlanacak talep yok.",
        });
      } else {
        setAlert({
          type: "error",
          message,
        });
      }
      setResult(null);
    } finally {
      setLoading(false);
    }
  };

  return (
    <AdminLayout>
      <div className="space-y-6">
        {/* Page title */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-white">Rota Planlama</h1>
            <p className="mt-2 text-sm text-white/70">
              Planlama parametrelerini ayarlayın ve başlatın
            </p>
          </div>
          <div>
            <label className="block text-sm font-medium text-white mb-2">
              Planlama Tarihi
            </label>
            <input
              type="date"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              className="rounded-xl border border-white/20 bg-white/10 px-4 py-2 text-white outline-none focus:ring-2 focus:ring-cyan-400/60 cursor-pointer"
            />
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Mode selector */}
          <div className="lg:col-span-2 space-y-6">
            <div className="rounded-2xl border border-white/20 bg-white/10 backdrop-blur-md p-6 shadow-xl">
              <h2 className="text-xl font-bold text-white mb-4">
                Planlama Modu
              </h2>
              <div className="space-y-3">
                <label className="flex items-start gap-3 p-4 rounded-xl border border-white/20 bg-white/5 cursor-pointer hover:bg-white/10 transition-colors">
                  <input
                    type="radio"
                    name="mode"
                    value="unlimited"
                    checked={mode === "unlimited"}
                    onChange={(e) => setMode(e.target.value as "unlimited")}
                    className="mt-1 h-4 w-4 text-cyan-500 focus:ring-cyan-400"
                  />
                  <div className="flex-1">
                    <div className="text-white font-semibold">
                      Sınırsız Araç (Minimum Maliyet)
                    </div>
                    <div className="text-sm text-white/70 mt-1">
                      Maliyet minimize edilir. Gerektiğinde kiralanabilir
                      araçlar kullanılabilir.
                    </div>
                  </div>
                </label>
                <label className="flex items-start gap-3 p-4 rounded-xl border border-white/20 bg-white/5 cursor-pointer hover:bg-white/10 transition-colors">
                  <input
                    type="radio"
                    name="mode"
                    value="limited"
                    checked={mode === "limited"}
                    onChange={(e) => setMode(e.target.value as "limited")}
                    className="mt-1 h-4 w-4 text-cyan-500 focus:ring-cyan-400"
                  />
                  <div className="flex-1">
                    <div className="text-white font-semibold">
                      Belirli Araç Sayısı (3 Araç)
                    </div>
                    <div className="text-sm text-white/70 mt-1">
                      Sadece mevcut 3 araç kullanılır. Araç kapasiteleri dikkate
                      alınır.
                    </div>
                  </div>
                </label>
              </div>
            </div>

            {/* Parameters */}
            <div className="rounded-2xl border border-white/20 bg-white/10 backdrop-blur-md p-6 shadow-xl">
              <h2 className="text-xl font-bold text-white mb-4">
                Parametreler
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-white mb-2">
                    Km Başına Maliyet (₺)
                  </label>
                  <input
                    type="number"
                    step="0.1"
                    value={kmCost}
                    onChange={(e) => setKmCost(e.target.value)}
                    className="w-full rounded-xl border border-white/20 bg-white/10 px-4 py-3 text-white outline-none focus:ring-2 focus:ring-cyan-400/60"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-white mb-2">
                    Araç 1 Kapasitesi (kg)
                  </label>
                  <input
                    type="number"
                    value={cap500}
                    onChange={(e) => setCap500(e.target.value)}
                    className="w-full rounded-xl border border-white/20 bg-white/10 px-4 py-3 text-white outline-none focus:ring-2 focus:ring-cyan-400/60"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-white mb-2">
                    Araç 2 Kapasitesi (kg)
                  </label>
                  <input
                    type="number"
                    value={cap750}
                    onChange={(e) => setCap750(e.target.value)}
                    className="w-full rounded-xl border border-white/20 bg-white/10 px-4 py-3 text-white outline-none focus:ring-2 focus:ring-cyan-400/60"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-white mb-2">
                    Araç 3 Kapasitesi (kg)
                  </label>
                  <input
                    type="number"
                    value={cap1000}
                    onChange={(e) => setCap1000(e.target.value)}
                    className="w-full rounded-xl border border-white/20 bg-white/10 px-4 py-3 text-white outline-none focus:ring-2 focus:ring-cyan-400/60"
                  />
                </div>
                {mode === "unlimited" && (
                  <>
                    <div>
                      <label className="block text-sm font-medium text-white mb-2">
                        Kiralık Araç Kapasitesi (kg)
                      </label>
                      <input
                        type="number"
                        value={rentalCap}
                        onChange={(e) => setRentalCap(e.target.value)}
                        className="w-full rounded-xl border border-white/20 bg-white/10 px-4 py-3 text-white outline-none focus:ring-2 focus:ring-cyan-400/60"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-white mb-2">
                        Kiralık Araç Maliyeti (₺)
                      </label>
                      <input
                        type="number"
                        value={rentalCost}
                        onChange={(e) => setRentalCost(e.target.value)}
                        className="w-full rounded-xl border border-white/20 bg-white/10 px-4 py-3 text-white outline-none focus:ring-2 focus:ring-cyan-400/60"
                      />
                    </div>
                  </>
                )}
              </div>
            </div>
          </div>

          {/* Info panel */}
          <div className="lg:col-span-1 space-y-6">
            <div className="rounded-2xl border border-cyan-400/30 bg-cyan-500/10 backdrop-blur-md p-6 shadow-xl">
              <div className="flex items-start gap-3">
                <svg
                  viewBox="0 0 24 24"
                  className="h-6 w-6 text-cyan-400 flex-shrink-0 mt-0.5"
                  fill="currentColor"
                >
                  <path d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <div className="text-sm text-cyan-300">
                  <p className="font-semibold mb-2">Önemli Bilgi</p>
                  <p className="text-cyan-300/90">
                    Brute-force yöntemi yasaktır. Planlama için sezgisel
                    algoritma (Greedy, En Yakın Komşu vb.) kullanılacaktır.
                  </p>
                </div>
              </div>
            </div>

            <div className="rounded-2xl border border-white/20 bg-white/10 backdrop-blur-md p-6 shadow-xl">
              <h3 className="text-lg font-bold text-white mb-3">
                Planlama Akışı
              </h3>
              <div className="space-y-3 text-sm text-white/80">
                <div className="flex items-start gap-2">
                  <div className="h-6 w-6 rounded-full bg-cyan-500/20 text-cyan-400 flex items-center justify-center flex-shrink-0 text-xs font-bold">
                    1
                  </div>
                  <div>Seçilen tarihin talepleri toplanır</div>
                </div>
                <div className="flex items-start gap-2">
                  <div className="h-6 w-6 rounded-full bg-cyan-500/20 text-cyan-400 flex items-center justify-center flex-shrink-0 text-xs font-bold">
                    2
                  </div>
                  <div>Sezgisel algoritma çalıştırılır</div>
                </div>
                <div className="flex items-start gap-2">
                  <div className="h-6 w-6 rounded-full bg-cyan-500/20 text-cyan-400 flex items-center justify-center flex-shrink-0 text-xs font-bold">
                    3
                  </div>
                  <div>Rota atanır ve sonuç kaydedilir</div>
                </div>
                <div className="flex items-start gap-2">
                  <div className="h-6 w-6 rounded-full bg-cyan-500/20 text-cyan-400 flex items-center justify-center flex-shrink-0 text-xs font-bold">
                    4
                  </div>
                  <div>
                    Sonuçlar &quot;Sonuçlar&quot; sekmesinde görüntülenebilir
                  </div>
                </div>
              </div>
            </div>

            <button
              onClick={handleStartPlanning}
              disabled={loading}
              className="w-full rounded-xl bg-gradient-to-r from-sky-500 to-cyan-400 px-6 py-4 text-center font-bold text-white shadow-lg hover:from-sky-600 hover:to-cyan-500 transition-all duration-200 text-lg disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
            >
              {loading ? "Planlanıyor..." : "Planlamayı Başlat"}
            </button>
          </div>
        </div>

        {/* Alert */}
        {alert && (
          <div
            className={`rounded-xl border px-4 py-3 text-sm ${
              alert.type === "success"
                ? "border-emerald-400/30 bg-emerald-500/15 text-emerald-200"
                : "border-red-400/30 bg-red-500/15 text-red-200"
            }`}
            role="alert"
          >
            {alert.message}
          </div>
        )}

        {/* Planning Result */}
        {result && (
          <div className="space-y-6">
            <div className="rounded-2xl border border-cyan-400/30 bg-cyan-500/10 backdrop-blur-md p-6 shadow-xl">
              <h2 className="text-2xl font-bold text-white mb-6">
                Planlama Sonucu
              </h2>

              {/* Summary stats */}
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
                <div className="rounded-xl bg-white/5 border border-white/20 p-4">
                  <div className="text-sm text-white/70 mb-1">
                    Toplam Maliyet
                  </div>
                  <div className="text-2xl font-bold text-cyan-400">
                    ₺{result.total_cost.toFixed(2)}
                  </div>
                </div>
                <div className="rounded-xl bg-white/5 border border-white/20 p-4">
                  <div className="text-sm text-white/70 mb-1">
                    Toplam Mesafe
                  </div>
                  <div className="text-2xl font-bold text-cyan-400">
                    {result.total_km.toFixed(1)} km
                  </div>
                </div>
                <div className="rounded-xl bg-white/5 border border-white/20 p-4">
                  <div className="text-sm text-white/70 mb-1">Araç Sayısı</div>
                  <div className="text-2xl font-bold text-cyan-400">
                    {result.vehicles.length}
                  </div>
                </div>
                <div className="rounded-xl bg-white/5 border border-white/20 p-4">
                  <div className="text-sm text-white/70 mb-1">Toplam Yük</div>
                  <div className="text-2xl font-bold text-cyan-400">
                    {result.total_load_kg.toFixed(1)} kg
                  </div>
                </div>
              </div>

              {/* Vehicles */}
              <div className="space-y-4">
                <h3 className="text-lg font-semibold text-white">Araçlar</h3>
                {result.vehicles.map((vehicle, idx) => (
                  <div
                    key={idx}
                    className="rounded-xl border border-white/20 bg-white/5 p-4"
                  >
                    <div className="flex items-start justify-between mb-3">
                      <div>
                        <div className="font-semibold text-white">
                          {vehicleDisplayName(vehicle.vehicle_id, {
                            index: idx + 1,
                            isRental: vehicle.is_rental,
                          })}
                          {vehicle.is_rental && (
                            <span className="text-sm text-orange-400 ml-2">
                              (Kiralık)
                            </span>
                          )}
                        </div>
                        <div className="text-sm text-white/70 mt-1">
                          Kapasite: {vehicle.capacity_kg} kg | Yük:{" "}
                          {vehicle.load_kg.toFixed(1)} kg (
                          {(
                            (vehicle.load_kg / vehicle.capacity_kg) *
                            100
                          ).toFixed(0)}
                          %)
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="text-lg font-bold text-cyan-400">
                          ₺{vehicle.total_cost.toFixed(2)}
                        </div>
                        <div className="text-sm text-white/70">
                          {vehicle.total_km.toFixed(1)} km
                        </div>
                      </div>
                    </div>

                    {/* Route */}
                    <div className="text-sm text-white/80 bg-white/5 rounded-lg p-3 mt-2">
                      <div className="text-white/60 mb-1">Rota:</div>
                      <div>
                        {vehicle.stops
                          .map((stop) => stop.station_name)
                          .join(" → ")}
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {/* Unserved stations */}
              {result.unserved_stations.length > 0 && (
                <div className="mt-6 p-4 rounded-xl border border-orange-400/30 bg-orange-500/10">
                  <div className="text-orange-300 font-semibold mb-2">
                    ⚠️ Hizmet Verilememiş İstasyonlar (
                    {result.unserved_stations.length})
                  </div>
                  <div className="space-y-1 text-sm text-orange-200/90">
                    {result.unserved_stations.map((station, idx) => (
                      <div key={idx}>
                        {station.station_name}: {station.demand_kg.toFixed(1)}{" "}
                        kg
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </AdminLayout>
  );
}
