import os

# Update /user/page.tsx (Dashboard)
user_dashboard_content = '''"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import UserLayout from "@/components/user/UserLayout";
import { apiGet } from "@/lib/api";

interface Station {
  id: number;
  name: string;
  lat: number;
  lon: number;
  is_active: boolean;
}

export default function UserDashboard() {
  const [stations, setStations] = useState<Station[]>([]);
  const [loadingStations, setLoadingStations] = useState(true);

  useEffect(() => {
    loadStations();
  }, []);

  async function loadStations() {
    setLoadingStations(true);
    try {
      const data = await apiGet<Station[]>("/stations");
      setStations(data);
    } catch (error) {
      console.error("Error loading stations:", error);
    } finally {
      setLoadingStations(false);
    }
  }

  // Placeholder data
  const stats = [
    { label: "Bekleyen Talepler", value: "3", color: "from-amber-500 to-orange-500", status: "PENDING" },
    { label: "Planlanan Talepler", value: "5", color: "from-emerald-500 to-green-500", status: "PLANNED" },
    { label: "Yarınki Toplam Yük", value: "850 kg", color: "from-cyan-500 to-blue-500" },
    { label: "Yarınki Toplam Adet", value: "24", color: "from-purple-500 to-pink-500" },
  ];

  const recentRequests = [
    { id: 1, date: "24.12.2025", station: "Merkez İstasyon", count: 5, weight: 120, status: "PLANNED" },
    { id: 2, date: "24.12.2025", station: "Kuzey Terminal", count: 3, weight: 80, status: "PLANNED" },
    { id: 3, date: "25.12.2025", station: "Güney Depo", count: 8, weight: 200, status: "PENDING" },
    { id: 4, date: "25.12.2025", station: "Doğu Hub", count: 2, weight: 45, status: "PENDING" },
    { id: 5, date: "23.12.2025", station: "Batı İstasyon", count: 4, weight: 95, status: "CANCELLED" },
  ];

  const getStatusBadge = (status: string) => {
    const styles = {
      PENDING: "bg-amber-500/20 text-amber-300 border-amber-400/30",
      PLANNED: "bg-emerald-500/20 text-emerald-300 border-emerald-400/30",
      CANCELLED: "bg-red-500/20 text-red-300 border-red-400/30",
    };
    const labels = {
      PENDING: "Beklemede",
      PLANNED: "Planlandı",
      CANCELLED: "İptal",
    };
    return (
      <span className={`px-3 py-1 rounded-full text-xs font-medium border ${styles[status as keyof typeof styles]}`}>
        {labels[status as keyof typeof labels]}
      </span>
    );
  };

  return (
    <UserLayout>
      <div className="space-y-8">
        {/* Page title */}
        <div>
          <h1 className="text-3xl font-bold text-white">Dashboard</h1>
          <p className="mt-2 text-sm text-white/70">
            Kargo taleplerinizi buradan yönetebilirsiniz.
          </p>
        </div>

        {/* Stats cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {stats.map((stat, idx) => (
            <div
              key={idx}
              className="rounded-2xl border border-white/20 bg-white/10 backdrop-blur-md p-6 shadow-xl"
            >
              <div
                className={`inline-flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br ${stat.color} mb-4`}
              >
                <svg
                  viewBox="0 0 24 24"
                  className="h-6 w-6 text-white"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                >
                  <path
                    d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              </div>
              <div className="text-3xl font-bold text-white">{stat.value}</div>
              <div className="mt-1 text-sm text-white/70">{stat.label}</div>
            </div>
          ))}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Quick request form */}
          <div className="lg:col-span-1">
            <div className="rounded-2xl border border-white/20 bg-white/10 backdrop-blur-md p-6 shadow-xl">
              <h2 className="text-xl font-bold text-white mb-4">
                Hızlı Talep Oluştur
              </h2>
              <form className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-white mb-2">
                    İstasyon
                  </label>
                  {loadingStations ? (
                    <div className="w-full rounded-xl border border-white/20 bg-slate-900/40 px-4 py-3 text-white/50 text-sm">
                      Yükleniyor...
                    </div>
                  ) : stations.length === 0 ? (
                    <div className="w-full rounded-xl border border-white/20 bg-slate-900/40 px-4 py-3 text-white/50 text-sm">
                      İstasyon bulunamadı
                    </div>
                  ) : (
                    <select className="w-full rounded-xl border border-white/20 bg-slate-900/40 backdrop-blur-sm px-4 py-3 text-white appearance-none outline-none focus:ring-2 focus:ring-cyan-400/60">
                      <option value="">İstasyon seçin...</option>
                      {stations.map((station) => (
                        <option key={station.id} value={station.id}>
                          {station.name}
                        </option>
                      ))}
                    </select>
                  )}
                </div>
                <div>
                  <label className="block text-sm font-medium text-white mb-2">
                    Kargo Adedi
                  </label>
                  <input
                    type="number"
                    placeholder="0"
                    className="w-full rounded-xl border border-white/20 bg-white/10 px-4 py-3 text-white placeholder:text-white/40 outline-none focus:ring-2 focus:ring-cyan-400/60"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-white mb-2">
                    Toplam Ağırlık (kg)
                  </label>
                  <input
                    type="number"
                    placeholder="0"
                    className="w-full rounded-xl border border-white/20 bg-white/10 px-4 py-3 text-white placeholder:text-white/40 outline-none focus:ring-2 focus:ring-cyan-400/60"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-white mb-2">
                    Tarih
                  </label>
                  <input
                    type="date"
                    defaultValue="2025-12-24"
                    className="w-full rounded-xl border border-white/20 bg-slate-900/40 backdrop-blur-sm px-4 py-3 text-white outline-none focus:ring-2 focus:ring-cyan-400/60"
                  />
                </div>
                <button
                  type="button"
                  disabled={loadingStations || stations.length === 0}
                  className="w-full rounded-xl bg-gradient-to-r from-sky-500 to-cyan-400 px-4 py-3 text-center font-semibold text-white shadow-sm hover:from-sky-600 hover:to-cyan-500 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Talep Oluştur
                </button>
                <p className="text-xs text-white/60">
                  Talebiniz planlama sonrası rotaya dahil edilir.
                </p>
              </form>
            </div>
          </div>

          {/* Recent requests table */}
          <div className="lg:col-span-2">
            <div className="rounded-2xl border border-white/20 bg-white/10 backdrop-blur-md p-6 shadow-xl">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-bold text-white">Son Taleplerim</h2>
                <Link
                  href="/user/requests"
                  className="text-sm text-cyan-400 hover:text-cyan-300 font-medium"
                >
                  Tümünü Gör →
                </Link>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-white/10">
                      <th className="pb-3 text-left text-sm font-medium text-white/70">Tarih</th>
                      <th className="pb-3 text-left text-sm font-medium text-white/70">İstasyon</th>
                      <th className="pb-3 text-right text-sm font-medium text-white/70">Adet</th>
                      <th className="pb-3 text-right text-sm font-medium text-white/70">Kg</th>
                      <th className="pb-3 text-center text-sm font-medium text-white/70">Durum</th>
                      <th className="pb-3 text-right text-sm font-medium text-white/70">İşlem</th>
                    </tr>
                  </thead>
                  <tbody>
                    {recentRequests.map((req) => (
                      <tr key={req.id} className="border-b border-white/5">
                        <td className="py-3 text-sm text-white">{req.date}</td>
                        <td className="py-3 text-sm text-white">{req.station}</td>
                        <td className="py-3 text-right text-sm text-white">{req.count}</td>
                        <td className="py-3 text-right text-sm text-white">{req.weight}</td>
                        <td className="py-3 text-center">{getStatusBadge(req.status)}</td>
                        <td className="py-3 text-right">
                          {req.status === "PLANNED" ? (
                            <Link
                              href="/user/route"
                              className="text-sm text-cyan-400 hover:text-cyan-300 font-medium"
                            >
                              Rotayı Gör
                            </Link>
                          ) : (
                            <span className="text-sm text-white/40">Detay</span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      </div>
    </UserLayout>
  );
}
'''

with open('c:/Users/Ebu-l Emin/Desktop/Yazlab3/apps/web/src/app/user/page.tsx', 'w', encoding='utf-8') as f:
    f.write(user_dashboard_content)

print("User dashboard page updated!")
