"use client";

import React, { useEffect, useMemo, useState } from "react";
import UserLayout from "@/components/user/UserLayout";
import Link from "next/link";
import { apiGet } from "@/lib/api";

type FilterDate = "all" | "today" | "tomorrow" | "week";
type FilterStatus = "all" | "PENDING" | "PLANNED" | "CANCELLED";

interface CargoRequestItem {
  id: number;
  station_id: number;
  station_name: string;
  cargo_count: number;
  total_weight_kg: number;
  target_date: string;
  status: string;
  created_at: string;
}

export default function MyRequestsPage() {
  const [filterDate, setFilterDate] = useState<FilterDate>("all");
  const [filterStatus, setFilterStatus] = useState<FilterStatus>("all");
  const [requests, setRequests] = useState<CargoRequestItem[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [alert, setAlert] = useState<string | null>(null);

  useEffect(() => {
    const fetchRequests = async () => {
      setLoading(true);
      setAlert(null);
      const email = localStorage.getItem("user_email") || "";
      if (!email) {
        setAlert("Kullanıcı bilgisi bulunamadı. Lütfen tekrar giriş yapın.");
        setLoading(false);
        return;
      }

      try {
        const data = await apiGet<CargoRequestItem[]>(
          "/requests/me",
          undefined,
          { "X-User-Email": email }
        );
        setRequests(data);
      } catch (error: unknown) {
        const message =
          error instanceof Error ? error.message : "Talepler yüklenemedi.";
        setAlert(message);
      } finally {
        setLoading(false);
      }
    };

    fetchRequests();
  }, []);

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
      <span
        className={`px-3 py-1 rounded-full text-xs font-medium border ${
          styles[status as keyof typeof styles]
        }`}
      >
        {labels[status as keyof typeof labels]}
      </span>
    );
  };

  const filteredRequests = useMemo(() => {
    const today = new Date();
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);

    const inThisWeek = (target: Date) => {
      const diff = (target.getTime() - today.getTime()) / (1000 * 60 * 60 * 24);
      return diff >= 0 && diff <= 7;
    };

    return requests.filter((req) => {
      const target = new Date(req.target_date);
      const statusMatch = filterStatus === "all" || req.status === filterStatus;

      let dateMatch = true;
      if (filterDate === "today") {
        dateMatch = target.toDateString() === today.toDateString();
      } else if (filterDate === "tomorrow") {
        dateMatch = target.toDateString() === tomorrow.toDateString();
      } else if (filterDate === "week") {
        dateMatch = inThisWeek(target);
      }

      return statusMatch && dateMatch;
    });
  }, [filterDate, filterStatus, requests]);

  const formatDate = (value: string) => {
    const d = new Date(value);
    if (Number.isNaN(d.getTime())) return value;
    return `${String(d.getDate()).padStart(2, "0")}.${String(
      d.getMonth() + 1
    ).padStart(2, "0")}.${d.getFullYear()}`;
  };

  const formatDateTime = (value: string) => {
    const d = new Date(value);
    if (Number.isNaN(d.getTime())) return value;
    const hours = String(d.getHours()).padStart(2, "0");
    const minutes = String(d.getMinutes()).padStart(2, "0");
    return `${formatDate(value)} ${hours}:${minutes}`;
  };

  return (
    <UserLayout>
      <div className="space-y-6">
        {/* Page title */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-white">Taleplerim</h1>
            <p className="mt-2 text-sm text-white/70">
              Oluşturduğunuz tüm kargo taleplerinizi görüntüleyin.
            </p>
          </div>
          <Link
            href="/user/request"
            className="rounded-xl bg-gradient-to-r from-sky-500 to-cyan-400 px-6 py-3 font-semibold text-white shadow-lg hover:from-sky-600 hover:to-cyan-500 transition-all duration-200"
          >
            + Yeni Talep
          </Link>
        </div>

        {/* Filters */}
        <div className="rounded-2xl border border-white/20 bg-white/10 backdrop-blur-md p-6 shadow-xl">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Date filter */}
            <div>
              <label className="block text-sm font-medium text-white mb-2">
                Tarih Aralığı
              </label>
              <select
                value={filterDate}
                onChange={(e) => setFilterDate(e.target.value as FilterDate)}
                className="w-full rounded-xl border border-white/20 bg-slate-900/40 backdrop-blur-sm px-4 py-3 text-white appearance-none outline-none focus:ring-2 focus:ring-cyan-400/60 transition-all"
              >
                <option value="all">Tümü</option>
                <option value="today">Bugün</option>
                <option value="tomorrow">Yarın</option>
                <option value="week">Bu Hafta</option>
              </select>
            </div>

            {/* Status filter */}
            <div>
              <label className="block text-sm font-medium text-white mb-2">
                Durum
              </label>
              <select
                value={filterStatus}
                onChange={(e) =>
                  setFilterStatus(e.target.value as FilterStatus)
                }
                className="w-full rounded-xl border border-white/20 bg-slate-900/40 backdrop-blur-sm px-4 py-3 text-white appearance-none outline-none focus:ring-2 focus:ring-cyan-400/60 transition-all"
              >
                <option value="all">Tümü</option>
                <option value="PENDING">Beklemede</option>
                <option value="PLANNED">Planlandı</option>
                <option value="CANCELLED">İptal</option>
              </select>
            </div>
          </div>
        </div>

        {/* Table */}
        <div className="rounded-2xl border border-white/20 bg-white/10 backdrop-blur-md shadow-xl overflow-hidden">
          {alert && (
            <div className="px-6 py-4 border-b border-white/10 text-sm text-red-300">
              {alert}
            </div>
          )}
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-white/5">
                <tr className="border-b border-white/10">
                  <th className="px-6 py-4 text-left text-sm font-semibold text-white/90">
                    Oluşturma
                  </th>
                  <th className="px-6 py-4 text-left text-sm font-semibold text-white/90">
                    Hedef Tarih
                  </th>
                  <th className="px-6 py-4 text-left text-sm font-semibold text-white/90">
                    İstasyon
                  </th>
                  <th className="px-6 py-4 text-right text-sm font-semibold text-white/90">
                    Adet
                  </th>
                  <th className="px-6 py-4 text-right text-sm font-semibold text-white/90">
                    Ağırlık (kg)
                  </th>
                  <th className="px-6 py-4 text-center text-sm font-semibold text-white/90">
                    Durum
                  </th>
                  <th className="px-6 py-4 text-right text-sm font-semibold text-white/90">
                    İşlem
                  </th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td
                      colSpan={7}
                      className="px-6 py-6 text-center text-sm text-white/60"
                    >
                      Yükleniyor...
                    </td>
                  </tr>
                ) : filteredRequests.length === 0 ? (
                  <tr>
                    <td
                      colSpan={7}
                      className="px-6 py-6 text-center text-sm text-white/60"
                    >
                      Henüz talebiniz bulunmuyor.
                    </td>
                  </tr>
                ) : (
                  filteredRequests.map((req, idx) => (
                    <tr
                      key={req.id}
                      className={`${
                        idx !== filteredRequests.length - 1
                          ? "border-b border-white/5"
                          : ""
                      } hover:bg-white/5 transition-colors`}
                    >
                      <td className="px-6 py-4 text-sm text-white/80">
                        {formatDateTime(req.created_at)}
                      </td>
                      <td className="px-6 py-4 text-sm text-white">
                        {formatDate(req.target_date)}
                      </td>
                      <td className="px-6 py-4 text-sm text-white">
                        {req.station_name}
                      </td>
                      <td className="px-6 py-4 text-right text-sm text-white">
                        {req.cargo_count}
                      </td>
                      <td className="px-6 py-4 text-right text-sm text-white">
                        {req.total_weight_kg}
                      </td>
                      <td className="px-6 py-4 text-center">
                        {getStatusBadge(req.status)}
                      </td>
                      <td className="px-6 py-4 text-right">
                        {req.status === "PLANNED" ? (
                          <Link
                            href="/user/route"
                            className="inline-flex items-center gap-1 text-sm text-cyan-400 hover:text-cyan-300 font-medium transition-colors"
                          >
                            Rotayı Gör
                            <svg
                              viewBox="0 0 20 20"
                              className="h-4 w-4"
                              fill="currentColor"
                            >
                              <path d="M10.894 2.553a1 1 0 00-1.788 0l-7 14a1 1 0 001.169 1.409l5-1.429A1 1 0 009 15.571V11a1 1 0 112 0v4.571a1 1 0 00.725.962l5 1.428a1 1 0 001.17-1.408l-7-14z" />
                            </svg>
                          </Link>
                        ) : (
                          <span className="text-sm text-white/50">-</span>
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* Footer with count */}
          <div className="border-t border-white/10 bg-white/5 px-6 py-4">
            <p className="text-sm text-white/70">
              Toplam{" "}
              <span className="font-semibold text-white">
                {filteredRequests.length}
              </span>{" "}
              talep gösteriliyor
            </p>
          </div>
        </div>
      </div>
    </UserLayout>
  );
}
