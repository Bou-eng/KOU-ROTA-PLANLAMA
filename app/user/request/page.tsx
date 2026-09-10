"use client";

import React, { useState, useEffect } from "react";
import UserLayout from "@/components/user/UserLayout";
import { useRouter } from "next/navigation";
import { apiGet, apiPost } from "@/lib/api";

interface Station {
  id: number;
  name: string;
  lat: number;
  lon: number;
  is_active: boolean;
}

export default function CreateRequestPage() {
  const router = useRouter();
  const [stations, setStations] = useState<Station[]>([]);
  const [loadingStations, setLoadingStations] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [stationId, setStationId] = useState<string>("");
  const [cargoCount, setCargoCount] = useState<string>("");
  const [totalWeight, setTotalWeight] = useState<string>("");
  const [targetDate, setTargetDate] = useState<string>("");
  const [notes, setNotes] = useState<string>("");
  const [alert, setAlert] = useState<{
    type: "success" | "error";
    message: string;
  } | null>(null);

  useEffect(() => {
    loadStations();
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    setTargetDate(tomorrow.toISOString().slice(0, 10));
  }, []);

  async function loadStations() {
    setLoadingStations(true);
    try {
      const data = await apiGet<Station[]>("/stations");
      setStations(data);
      if (data.length === 0) {
        setAlert({ type: "error", message: "Henüz istasyon bulunmamaktadır." });
      }
    } catch (error) {
      console.error("Error loading stations:", error);
      setAlert({ type: "error", message: "İstasyonlar yüklenemedi." });
    } finally {
      setLoadingStations(false);
    }
  }

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setAlert(null);

    const email = localStorage.getItem("user_email") || "";
    if (!email) {
      setAlert({
        type: "error",
        message: "Kullanıcı bilgisi bulunamadı. Lütfen tekrar giriş yapın.",
      });
      return;
    }

    if (!stationId) {
      setAlert({ type: "error", message: "Lütfen istasyon seçin." });
      return;
    }

    setSubmitting(true);
    try {
      await apiPost(
        "/requests",
        {
          station_id: Number(stationId),
          cargo_count: Number(cargoCount),
          total_weight_kg: Number(totalWeight),
          target_date: targetDate,
        },
        undefined,
        { "X-User-Email": email }
      );

      setAlert({ type: "success", message: "Talep oluşturuldu." });
      setNotes("");
      setCargoCount("");
      setTotalWeight("");
      setStationId("");
      setTimeout(() => {
        router.push("/user/requests");
      }, 1200);
    } catch (error: unknown) {
      const message =
        error instanceof Error
          ? error.message
          : "Talep oluşturulurken hata oluştu.";
      setAlert({ type: "error", message });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <UserLayout>
      <div className="max-w-3xl mx-auto space-y-6">
        {/* Page title */}
        <div>
          <h1 className="text-3xl font-bold text-white">
            Kargo Talebi Oluştur
          </h1>
          <p className="mt-2 text-sm text-white/70">
            Yeni bir kargo talebi oluşturun. Talep oluşturulduktan sonra
            planlama yapıldığında rotaya dahil edilecektir.
          </p>
        </div>

        {/* Alert */}
        {alert && (
          <div
            className={`rounded-xl border px-4 py-3 ${
              alert.type === "success"
                ? "border-emerald-400/30 bg-emerald-500/10 text-emerald-300"
                : "border-red-400/30 bg-red-500/10 text-red-300"
            }`}
          >
            {alert.message}
          </div>
        )}

        {/* Form */}
        <div className="rounded-2xl border border-white/20 bg-white/10 backdrop-blur-md p-8 shadow-xl">
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Station */}
            <div>
              <label className="block text-sm font-medium text-white mb-2">
                İstasyon Seçimi <span className="text-red-400">*</span>
              </label>
              {loadingStations ? (
                <div className="w-full rounded-xl border border-white/20 bg-slate-900/40 px-4 py-3 text-white/50">
                  Yükleniyor...
                </div>
              ) : (
                <select
                  required
                  disabled={stations.length === 0}
                  value={stationId}
                  onChange={(e) => setStationId(e.target.value)}
                  className="w-full rounded-xl border border-white/20 bg-slate-900/40 backdrop-blur-sm px-4 py-3 text-white appearance-none outline-none focus:ring-2 focus:ring-cyan-400/60 transition-all disabled:opacity-50"
                >
                  <option value="">Bir istasyon seçin...</option>
                  {stations.map((station) => (
                    <option key={station.id} value={station.id}>
                      {station.name}
                    </option>
                  ))}
                </select>
              )}
              <p className="mt-1 text-xs text-white/50">
                Kargonun teslim edileceği istasyonu seçin.
              </p>
            </div>

            {/* Cargo count */}
            <div>
              <label className="block text-sm font-medium text-white mb-2">
                Kargo Adedi <span className="text-red-400">*</span>
              </label>
              <input
                type="number"
                required
                min="1"
                placeholder="Örn: 5"
                value={cargoCount}
                onChange={(e) => setCargoCount(e.target.value)}
                className="w-full rounded-xl border border-white/20 bg-white/10 px-4 py-3 text-white placeholder:text-white/40 outline-none focus:ring-2 focus:ring-cyan-400/60 transition-all"
              />
              <p className="mt-1 text-xs text-white/50">
                Gönderilecek toplam kargo sayısını girin.
              </p>
            </div>

            {/* Total weight */}
            <div>
              <label className="block text-sm font-medium text-white mb-2">
                Toplam Ağırlık (kg) <span className="text-red-400">*</span>
              </label>
              <input
                type="number"
                required
                min="1"
                step="0.1"
                placeholder="Örn: 125.5"
                value={totalWeight}
                onChange={(e) => setTotalWeight(e.target.value)}
                className="w-full rounded-xl border border-white/20 bg-white/10 px-4 py-3 text-white placeholder:text-white/40 outline-none focus:ring-2 focus:ring-cyan-400/60 transition-all"
              />
              <p className="mt-1 text-xs text-white/50">
                Tüm kargoların toplam ağırlığını kilogram cinsinden girin.
              </p>
            </div>

            {/* Target date */}
            <div>
              <label className="block text-sm font-medium text-white mb-2">
                Hedef Tarih <span className="text-red-400">*</span>
              </label>
              <input
                type="date"
                required
                value={targetDate}
                onChange={(e) => setTargetDate(e.target.value)}
                className="w-full rounded-xl border border-white/20 bg-slate-900/40 backdrop-blur-sm px-4 py-3 text-white outline-none focus:ring-2 focus:ring-cyan-400/60 transition-all"
              />
              <p className="mt-1 text-xs text-white/50">
                Kargonun ulaşması gereken tarihi seçin.
              </p>
            </div>

            {/* Additional notes */}
            <div>
              <label className="block text-sm font-medium text-white mb-2">
                Ek Notlar (opsiyonel)
              </label>
              <textarea
                rows={4}
                placeholder="Özel talep veya notlarınızı buraya yazabilirsiniz..."
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                className="w-full rounded-xl border border-white/20 bg-white/10 px-4 py-3 text-white placeholder:text-white/40 outline-none focus:ring-2 focus:ring-cyan-400/60 transition-all resize-none"
              />
            </div>

            {/* Actions */}
            <div className="flex gap-4 pt-4">
              <button
                type="submit"
                disabled={stations.length === 0 || submitting}
                className="flex-1 rounded-xl bg-gradient-to-r from-sky-500 to-cyan-400 px-6 py-3 text-center font-semibold text-white shadow-lg hover:from-sky-600 hover:to-cyan-500 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {submitting ? "Kaydediliyor..." : "Kaydet"}
              </button>
              <button
                type="button"
                onClick={() => router.push("/user")}
                className="rounded-xl border border-white/20 bg-white/5 px-6 py-3 font-semibold text-white hover:bg-white/10 transition-all duration-200"
              >
                İptal
              </button>
            </div>
          </form>
        </div>

        {/* Info box */}
        <div className="rounded-xl border border-cyan-400/30 bg-cyan-500/10 p-4">
          <div className="flex gap-3">
            <svg
              viewBox="0 0 24 24"
              className="h-5 w-5 text-cyan-400 flex-shrink-0 mt-0.5"
              fill="currentColor"
            >
              <path d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <div className="text-sm text-cyan-300">
              <p className="font-medium mb-1">Bilgi</p>
              <p className="text-cyan-300/80">
                Oluşturduğunuz talep &quot;Beklemede&quot; durumunda olacaktır.
                Sistem yöneticisi planlama yaptığında talebiniz otomatik olarak
                bir rotaya atanacak ve &quot;Planlandı&quot; durumuna
                geçecektir.
              </p>
            </div>
          </div>
        </div>
      </div>
    </UserLayout>
  );
}
