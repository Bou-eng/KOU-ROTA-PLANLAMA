"use client";

import React, { useEffect, useMemo, useState } from "react";
import AdminLayout from "@/components/admin/AdminLayout";
import Link from "next/link";
import { apiGet, apiDelete } from "@/lib/api";

interface PlanRun {
  id: number;
  run_date: string;
  total_cost: number;
  vehicle_count: number;
  created_at: string;
  mode: string;
}

type FilterMode = "all" | "fixed" | "unlimited";

export default function RunsPage() {
  const [runs, setRuns] = useState<PlanRun[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [alert, setAlert] = useState<{
    type: "success" | "error";
    message: string;
  } | null>(null);
  const [filter, setFilter] = useState<FilterMode>("all");
  const [deleteConfirm, setDeleteConfirm] = useState<{
    type: "single" | "all";
    runId?: number;
  } | null>(null);
  const [isDeleting, setIsDeleting] = useState<boolean>(false);

  // Load runs
  useEffect(() => {
    let mounted = true;
    async function loadRuns() {
      try {
        setLoading(true);
        setError(null);
        const modeParam = filter === "all" ? undefined : filter;
        const data = await apiGet<PlanRun[]>(
          `/planning/runs${modeParam ? `?mode=${modeParam}` : ""}`
        );
        if (!mounted) return;
        setRuns(data);
      } catch (err: any) {
        if (!mounted) return;
        setError(err?.message || "Planlama kayıtları yüklenemedi.");
        setRuns([]);
      } finally {
        if (mounted) setLoading(false);
      }
    }
    loadRuns();
    return () => {
      mounted = false;
    };
  }, [filter]);

  const stats = useMemo(() => {
    const count = runs.length;
    const avg = count
      ? runs.reduce((sum, r) => sum + (r.total_cost || 0), 0) / count
      : 0;
    const latest = runs[0]?.created_at ? new Date(runs[0].created_at) : null;
    const latestDateStr = latest ? latest.toLocaleDateString("tr-TR") : "—";
    return { count, avg: Math.round(avg), latestDateStr };
  }, [runs]);

  const handleDeleteSingle = async (runId: number) => {
    setIsDeleting(true);
    try {
      await apiDelete(`/planning/runs/${runId}`);
      setAlert({
        type: "success",
        message: "Planlama kaydı silindi.",
      });
      setDeleteConfirm(null);
      // Refresh list
      const modeParam = filter === "all" ? undefined : filter;
      const data = await apiGet<PlanRun[]>(
        `/planning/runs${modeParam ? `?mode=${modeParam}` : ""}`
      );
      setRuns(data);
    } catch (err: any) {
      setAlert({
        type: "error",
        message: err?.message || "Silme işlemi başarısız.",
      });
      setDeleteConfirm(null);
    } finally {
      setIsDeleting(false);
    }
  };

  const handleDeleteAll = async () => {
    setIsDeleting(true);
    try {
      await apiDelete("/planning/runs");
      setAlert({
        type: "success",
        message: "Tüm kayıtlar silindi.",
      });
      setDeleteConfirm(null);
      setRuns([]);
    } catch (err: any) {
      setAlert({
        type: "error",
        message: err?.message || "Silme işlemi başarısız.",
      });
      setDeleteConfirm(null);
    } finally {
      setIsDeleting(false);
    }
  };

  const getModeLabel = (mode: string): string => {
    if (mode === "FIXED") return "Belirli Araç (3)";
    return "Sınırsız Araç";
  };

  return (
    <AdminLayout>
      <div className="space-y-6">
        {/* Page title */}
        <div>
          <h1 className="text-3xl font-bold text-white">Geçmiş Planlamalar</h1>
          <p className="mt-2 text-sm text-white/70">
            Daha önce çalıştırılan tüm planlama kayıtları
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

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="rounded-2xl border border-white/20 bg-white/10 backdrop-blur-md p-4 shadow-xl">
            <div className="text-sm text-white/70">Toplam Planlama</div>
            <div className="text-2xl font-bold text-white">{stats.count}</div>
          </div>
          <div className="rounded-2xl border border-white/20 bg-white/10 backdrop-blur-md p-4 shadow-xl">
            <div className="text-sm text-white/70">Ortalama Maliyet</div>
            <div className="text-2xl font-bold text-white">₺{stats.avg}</div>
          </div>
          <div className="rounded-2xl border border-white/20 bg-white/10 backdrop-blur-md p-4 shadow-xl">
            <div className="text-sm text-white/70">Son Çalıştırma</div>
            <div className="text-2xl font-bold text-white">
              {stats.latestDateStr}
            </div>
          </div>
        </div>

        {/* Runs table */}
        <div className="rounded-2xl border border-white/20 bg-white/10 backdrop-blur-md shadow-xl overflow-hidden">
          {/* Header with filter and delete all button */}
          <div className="p-6 border-b border-white/10 flex items-center justify-between gap-4 flex-wrap">
            <h2 className="text-xl font-bold text-white">Planlama Kayıtları</h2>
            <div className="flex items-center gap-3 flex-wrap">
              <div className="flex items-center gap-2">
                <label className="text-sm text-white/70">Filtre:</label>
                <select
                  value={filter}
                  onChange={(e) => setFilter(e.target.value as FilterMode)}
                  className="cursor-pointer rounded-lg border border-white/20 bg-slate-800 backdrop-blur-sm px-3 py-2 text-sm font-medium text-white hover:bg-slate-700 hover:border-white/30 focus:outline-none focus:ring-2 focus:ring-cyan-400 focus:ring-offset-0 focus:border-transparent transition-colors appearance-none"
                  style={{
                    backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 12 12'%3E%3Cpath fill='%23ffffff' d='M6 9L1 4h10z'/%3E%3C/svg%3E")`,
                    backgroundRepeat: "no-repeat",
                    backgroundPosition: "right 0.5rem center",
                    paddingRight: "1.75rem",
                    colorScheme: "dark",
                  }}
                >
                  <option value="all" className="bg-slate-800 text-white">
                    Tümü
                  </option>
                  <option value="fixed" className="bg-slate-800 text-white">
                    Belirli Araç (3)
                  </option>
                  <option value="unlimited" className="bg-slate-800 text-white">
                    Sınırsız Araç
                  </option>
                </select>
              </div>
              {runs.length > 0 && (
                <button
                  onClick={() => setDeleteConfirm({ type: "all" })}
                  disabled={isDeleting}
                  className="cursor-pointer rounded-lg bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700 transition-colors disabled:opacity-50"
                >
                  Hepsini Sil
                </button>
              )}
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-white/5">
                <tr className="border-b border-white/10">
                  <th className="px-6 py-4 text-left text-sm font-semibold text-white/90 w-10">
                    {/* Delete icon placeholder */}
                  </th>
                  <th className="px-6 py-4 text-left text-sm font-semibold text-white/90">
                    Rota Tarihi
                  </th>
                  <th className="px-6 py-4 text-left text-sm font-semibold text-white/90">
                    Mod
                  </th>
                  <th className="px-6 py-4 text-right text-sm font-semibold text-white/90">
                    Toplam Maliyet
                  </th>
                  <th className="px-6 py-4 text-right text-sm font-semibold text-white/90">
                    Araç Sayısı
                  </th>
                  <th className="px-6 py-4 text-left text-sm font-semibold text-white/90">
                    Oluşturulma
                  </th>
                  <th className="px-6 py-4 text-right text-sm font-semibold text-white/90">
                    İşlem
                  </th>
                </tr>
              </thead>
              <tbody>
                {loading && (
                  <tr>
                    <td colSpan={7} className="px-6 py-4 text-sm text-white/70">
                      Kayıtlar yükleniyor...
                    </td>
                  </tr>
                )}

                {!loading && error && (
                  <tr>
                    <td colSpan={7} className="px-6 py-4 text-sm text-red-200">
                      {error}
                    </td>
                  </tr>
                )}

                {!loading && !error && runs.length === 0 && (
                  <tr>
                    <td colSpan={7} className="px-6 py-4 text-sm text-white/70">
                      Henüz planlama kaydı yok.
                    </td>
                  </tr>
                )}

                {!loading &&
                  !error &&
                  runs.map((run, idx) => (
                    <tr
                      key={run.id}
                      className={`${
                        idx !== runs.length - 1 ? "border-b border-white/5" : ""
                      } hover:bg-white/5 transition-colors group`}
                    >
                      <td className="px-6 py-4">
                        <button
                          onClick={() =>
                            setDeleteConfirm({ type: "single", runId: run.id })
                          }
                          className="text-red-500 opacity-0 group-hover:opacity-100 transition-opacity hover:text-red-400 cursor-pointer"
                          title="Sil"
                        >
                          <svg
                            className="h-4 w-4"
                            viewBox="0 0 20 20"
                            fill="currentColor"
                          >
                            <path
                              fillRule="evenodd"
                              d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v6a1 1 0 102 0V8a1 1 0 00-1-1z"
                              clipRule="evenodd"
                            />
                          </svg>
                        </button>
                      </td>
                      <td className="px-6 py-4 text-sm text-white font-medium">
                        {new Date(run.run_date).toLocaleDateString("tr-TR")}
                      </td>
                      <td className="px-6 py-4 text-sm text-white/80">
                        <span className="inline-flex items-center px-2 py-1 rounded bg-white/10 text-xs">
                          {getModeLabel(run.mode)}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-right text-sm font-semibold text-emerald-300">
                        ₺{Math.round(run.total_cost)}
                      </td>
                      <td className="px-6 py-4 text-right text-sm text-white">
                        {run.vehicle_count}
                      </td>
                      <td className="px-6 py-4 text-sm text-white/70">
                        {new Date(run.created_at).toLocaleString("tr-TR")}
                      </td>
                      <td className="px-6 py-4 text-right">
                        <Link
                          href="/admin/results"
                          className="inline-flex items-center gap-1 text-sm text-cyan-400 hover:text-cyan-300 font-medium transition-colors"
                          onClick={() => {
                            try {
                              window.localStorage.setItem(
                                "planning_selected_run_id",
                                String(run.id)
                              );
                            } catch {}
                          }}
                        >
                          Görüntüle
                          <svg
                            viewBox="0 0 20 20"
                            className="h-4 w-4"
                            fill="currentColor"
                          >
                            <path d="M10.894 2.553a1 1 0 00-1.788 0l-7 14a1 1 0 001.169 1.409l5-1.429A1 1 0 009 15.571V11a1 1 0 112 0v4.571a1 1 0 00.725.962l5 1.428a1 1 0 001.17-1.408l-7-14z" />
                          </svg>
                        </Link>
                      </td>
                    </tr>
                  ))}
              </tbody>
            </table>
          </div>
          <div className="border-t border-white/10 bg-white/5 px-6 py-4">
            <p className="text-sm text-white/70">
              Toplam{" "}
              <span className="font-semibold text-white">{runs.length}</span>{" "}
              kayıt
            </p>
          </div>
        </div>
      </div>

      {/* Delete confirmation modal */}
      {deleteConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-2xl border border-white/10 bg-slate-950/70 p-6 shadow-2xl">
            <h3 className="text-xl font-bold text-white mb-2">
              {deleteConfirm.type === "single"
                ? "Planlama kaydını silmek istediğinize emin misiniz?"
                : "Tüm planlama kayıtlarını silmek istediğinize emin misiniz?"}
            </h3>
            <p className="text-sm text-white/70 mb-6">
              {deleteConfirm.type === "single"
                ? "Bu kayıt silinecek. Bu işlem geri alınamaz."
                : "Tüm geçmiş planlamalar silinecek. Bu işlem geri alınamaz."}
            </p>
            <div className="flex justify-end gap-3">
              <button
                type="button"
                onClick={() => setDeleteConfirm(null)}
                disabled={isDeleting}
                className="cursor-pointer rounded-lg border border-white/20 bg-white/10 px-6 py-2 text-sm font-medium text-white hover:bg-white/15 transition-colors disabled:opacity-50"
              >
                İptal
              </button>
              <button
                type="button"
                onClick={() => {
                  if (deleteConfirm.type === "single" && deleteConfirm.runId) {
                    handleDeleteSingle(deleteConfirm.runId);
                  } else if (deleteConfirm.type === "all") {
                    handleDeleteAll();
                  }
                }}
                disabled={isDeleting}
                className="cursor-pointer rounded-lg bg-red-600 px-6 py-2 text-sm font-medium text-white hover:bg-red-700 transition-colors disabled:opacity-50"
              >
                {isDeleting ? "Siliniyor..." : "Sil"}
              </button>
            </div>
          </div>
        </div>
      )}
    </AdminLayout>
  );
}
