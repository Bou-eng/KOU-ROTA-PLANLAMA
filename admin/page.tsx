"use client";

import React, { useEffect, useState } from "react";
import AdminLayout from "@/components/admin/AdminLayout";
import Link from "next/link";
import { apiGet, apiPost } from "@/lib/api";

interface DemandsResponse {
  summary: Array<{
    station_name: string;
    total_count: number;
    total_weight_kg: number;
  }>;
}

interface PlanningResponse {
  date: string;
  total_cost: number;
  total_km: number;
  vehicles: Array<{
    vehicle_id: string;
    load_kg: number;
    stops: Array<{ station_id: number; station_name: string }>;
  }>;
}

interface Station {
  id: number;
  name: string;
}

export default function AdminDashboard() {
  const [stats, setStats] = useState([
    {
      label: "Yarınki İstasyon Sayısı",
      value: "—",
      color: "from-cyan-500 to-blue-500",
    },
    {
      label: "Yarınki Toplam Talep",
      value: "—",
      color: "from-emerald-500 to-green-500",
    },
    {
      label: "Toplam Planlama Koşusu",
      value: "—",
      color: "from-purple-500 to-pink-500",
    },
    {
      label: "Son Çalıştırma Maliyeti",
      value: "—",
      color: "from-amber-500 to-orange-500",
    },
  ]);

  const [loading, setLoading] = useState(true);
  const [planLoading, setPlanLoading] = useState(false);

  useEffect(() => {
    loadDashboardData();
  }, []);

  async function loadDashboardData() {
    try {
      setLoading(true);

      // Get tomorrow's date
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      const tomorrowStr = tomorrow.toISOString().split("T")[0];

      // Fetch demands and stations in parallel
      const [demandsData, stationsData, planData] = await Promise.all([
        apiGet<DemandsResponse>(`/admin/demands?date=${tomorrowStr}`).catch(
          () => null
        ),
        apiGet<Station[]>("/admin/stations").catch(() => null),
        apiGet<PlanningResponse>(`/planning/latest?date=${tomorrowStr}`).catch(
          () => null
        ),
      ]);

      const newStats = [...stats];

      // Active stations count
      if (stationsData) {
        newStats[0].value = stationsData.filter((s) => s).length.toString();
      }

      // Total demand
      if (demandsData?.summary) {
        const totalCount = demandsData.summary.reduce(
          (sum, s) => sum + s.total_count,
          0
        );
        newStats[1].value = totalCount.toString();
      }

      // Vehicle count
      if (planData?.vehicles) {
        newStats[2].value = planData.vehicles.length.toString();
      }

      // Last run cost
      if (planData?.total_cost) {
        newStats[3].value = `₺${Math.round(planData.total_cost)}`;
      }

      setStats(newStats);
    } catch (error) {
      console.error("Error loading dashboard data:", error);
    } finally {
      setLoading(false);
    }
  }

  async function handleRunPlanning() {
    if (planLoading) return;

    try {
      setPlanLoading(true);
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      const tomorrowStr = tomorrow.toISOString().split("T")[0];

      const result = await apiPost<PlanningResponse>(
        `/planning/run?date=${tomorrowStr}`,
        {}
      );

      if (result) {
        setStats((prev) => [
          prev[0],
          prev[1],
          { ...prev[2], value: result.vehicles?.length?.toString() || "—" },
          { ...prev[3], value: `₺${Math.round(result.total_cost || 0)}` },
        ]);
      }
    } catch (error: any) {
      alert(`Planlama hatası: ${error.message || "Bilinmeyen hata"}`);
    } finally {
      setPlanLoading(false);
    }
  }

  const quickLinks = [
    {
      title: "İstasyon Yönetimi",
      description: "İstasyonları görüntüle ve yönet",
      href: "/admin/stations",
      icon: (
        <path
          d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z M15 11a3 3 0 11-6 0 3 3 0 016 0z"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      ),
      color: "from-cyan-500 to-blue-500",
    },
    {
      title: "Talepler",
      description: "Kullanıcı taleplerini incele",
      href: "/admin/demands",
      icon: (
        <path
          d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      ),
      color: "from-emerald-500 to-green-500",
    },
    {
      title: "Rota Planlama",
      description: "Yeni planlama başlat",
      href: "/admin/planning",
      icon: (
        <path
          d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      ),
      color: "from-purple-500 to-pink-500",
    },
    {
      title: "Geçmiş Planlamalar",
      description: "Önceki sonuçları görüntüle",
      href: "/admin/runs",
      icon: (
        <path
          d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      ),
      color: "from-amber-500 to-orange-500",
    },
  ];

  return (
    <AdminLayout>
      <div className="space-y-8">
        {/* Page title */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-white">Admin Dashboard</h1>
            <p className="mt-2 text-sm text-white/70">
              Sistem özeti ve hızlı erişim menüsü
            </p>
          </div>
          <button
            onClick={handleRunPlanning}
            disabled={planLoading || loading}
            className="cursor-pointer rounded-lg bg-gradient-to-r from-cyan-500 to-blue-500 px-6 py-3 text-sm font-semibold text-white hover:from-cyan-600 hover:to-blue-600 transition-all disabled:opacity-50"
          >
            {planLoading ? "Planlama Yapılıyor..." : "Planla"}
          </button>
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
                    d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"
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

        {/* Quick links */}
        <div>
          <h2 className="text-xl font-bold text-white mb-4">Hızlı Erişim</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {quickLinks.map((link, idx) => (
              <Link
                key={idx}
                href={link.href}
                className="group rounded-2xl border border-white/20 bg-white/10 backdrop-blur-md p-6 shadow-xl hover:bg-white/15 transition-all duration-200"
              >
                <div className="flex items-start gap-4">
                  <div
                    className={`flex-shrink-0 h-12 w-12 rounded-xl bg-gradient-to-br ${link.color} grid place-items-center`}
                  >
                    <svg
                      viewBox="0 0 24 24"
                      className="h-6 w-6 text-white"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                    >
                      {link.icon}
                    </svg>
                  </div>
                  <div className="flex-1">
                    <h3 className="text-lg font-semibold text-white group-hover:text-cyan-300 transition-colors">
                      {link.title}
                    </h3>
                    <p className="mt-1 text-sm text-white/70">
                      {link.description}
                    </p>
                  </div>
                  <svg
                    viewBox="0 0 24 24"
                    className="h-5 w-5 text-white/40 group-hover:text-white/70 transition-colors"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                  >
                    <path
                      d="M9 5l7 7-7 7"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                </div>
              </Link>
            ))}
          </div>
        </div>
      </div>
    </AdminLayout>
  );
}
