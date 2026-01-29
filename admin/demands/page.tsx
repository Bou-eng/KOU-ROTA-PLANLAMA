"use client";

import React, { useEffect, useMemo, useState } from "react";
import AdminLayout from "@/components/admin/AdminLayout";
import { apiGet, apiDelete } from "@/lib/api";

interface DemandSummaryItem {
  station_id: number;
  station_name: string;
  total_count: number;
  total_weight_kg: number;
}

interface DemandDetailItem {
  id: number;
  user_email: string;
  station_name: string;
  cargo_count: number;
  total_weight_kg: number;
  status: string;
  created_at: string;
  target_date: string;
}

interface DemandsResponse {
  summary: DemandSummaryItem[];
  details: DemandDetailItem[];
}

export default function DemandsPage() {
  const [dateValue, setDateValue] = useState<string>("");
  const [deleteConfirmDemand, setDeleteConfirmDemand] =
    useState<DemandDetailItem | null>(null);
  const [deleteAllConfirm, setDeleteAllConfirm] = useState<boolean>(false);
  const [deleteLoading, setDeleteLoading] = useState<boolean>(false);
  const [summaryByStation, setSummaryByStation] = useState<DemandSummaryItem[]>(
    []
  );
  const [detailedRequests, setDetailedRequests] = useState<DemandDetailItem[]>(
    []
  );
  const [loading, setLoading] = useState<boolean>(true);
  const [alert, setAlert] = useState<string | null>(null);

  useEffect(() => {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    const iso = tomorrow.toISOString().slice(0, 10);
    setDateValue(iso);
  }, []);

  const loadDemands = async (dateParam: string) => {
    if (!dateParam) return;
    setLoading(true);
    setAlert(null);
    try {
      const data = await apiGet<DemandsResponse>(
        `/admin/demands?date=${dateParam}`
      );
      setSummaryByStation(data.summary || []);
      setDetailedRequests(data.details || []);
    } catch (error: unknown) {
      const message =
        error instanceof Error ? error.message : "Talepler yüklenemedi.";
      setAlert(message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (dateValue) {
      loadDemands(dateValue);
    }
  }, [dateValue]);

  async function handleConfirmDelete() {
    if (!deleteConfirmDemand) return;
    setDeleteLoading(true);
    try {
      await apiDelete(`/admin/demands/${deleteConfirmDemand.id}`);
      setAlert("Talep silindi.");
      await loadDemands(dateValue);
    } catch (error: unknown) {
      const message =
        error instanceof Error ? error.message : "Talep silinemedi.";
      setAlert(message);
    } finally {
      setDeleteLoading(false);
      setDeleteConfirmDemand(null);
    }
  }

  async function handleConfirmDeleteAll() {
    setDeleteLoading(true);
    try {
      const response = await apiDelete<{ deleted: number }>(
        `/admin/demands?date=${dateValue}`
      );
      setAlert(`${response.deleted} talep silindi.`);
      setDeleteAllConfirm(false);
      await loadDemands(dateValue);
    } catch (error: unknown) {
      const message =
        error instanceof Error ? error.message : "Toplu silme başarısız.";
      setAlert(message);
      setDeleteAllConfirm(false);
    } finally {
      setDeleteLoading(false);
    }
  }

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

  const totalCount = useMemo(
    () => summaryByStation.reduce((sum, s) => sum + (s.total_count || 0), 0),
    [summaryByStation]
  );
  const totalWeight = useMemo(
    () =>
      summaryByStation.reduce((sum, s) => sum + (s.total_weight_kg || 0), 0),
    [summaryByStation]
  );

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-white">
              Talepler (Ertesi Gün)
            </h1>
            <p className="mt-2 text-sm text-white/70">
              Seçili tarihteki tüm kargo talepleri
            </p>
          </div>
          <div className="flex items-center gap-2">
            <label className="text-sm text-white/70">Tarih:</label>
            <input
              type="date"
              value={dateValue}
              onChange={(e) => setDateValue(e.target.value)}
              className="rounded-xl border border-white/20 bg-slate-900/40 backdrop-blur-sm px-4 py-2 text-white text-sm outline-none focus:ring-2 focus:ring-cyan-400/60"
            />
          </div>
        </div>

        {alert && (
          <div className="rounded-xl border border-red-400/30 bg-red-500/10 px-4 py-3 text-sm text-red-300">
            {alert}
          </div>
        )}

        <div className="rounded-2xl border border-white/20 bg-white/10 backdrop-blur-md shadow-xl overflow-hidden">
          <div className="p-6 border-b border-white/10 flex items-center justify-between">
            <h2 className="text-xl font-bold text-white">İstasyon Özeti</h2>
            <div className="flex items-center gap-4 text-sm">
              <span className="text-white/70">
                Toplam{" "}
                <span className="font-semibold text-white">
                  {totalCount} adet
                </span>
              </span>
              <span className="text-white/70">•</span>
              <span className="text-white/70">
                <span className="font-semibold text-white">
                  {totalWeight} kg
                </span>
              </span>
            </div>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-white/5">
                <tr className="border-b border-white/10">
                  <th className="px-6 py-4 text-left text-sm font-semibold text-white/90">
                    İstasyon
                  </th>
                  <th className="px-6 py-4 text-right text-sm font-semibold text-white/90">
                    Toplam Adet
                  </th>
                  <th className="px-6 py-4 text-right text-sm font-semibold text-white/90">
                    Toplam Kg
                  </th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td
                      colSpan={3}
                      className="px-6 py-6 text-center text-sm text-white/60"
                    >
                      Yükleniyor...
                    </td>
                  </tr>
                ) : summaryByStation.length === 0 ? (
                  <tr>
                    <td
                      colSpan={3}
                      className="px-6 py-6 text-center text-sm text-white/60"
                    >
                      Bu tarihte talep bulunamadı.
                    </td>
                  </tr>
                ) : (
                  summaryByStation.map((item, idx) => (
                    <tr
                      key={item.station_id}
                      className={`${
                        idx !== summaryByStation.length - 1
                          ? "border-b border-white/5"
                          : ""
                      } hover:bg-white/5 transition-colors`}
                    >
                      <td className="px-6 py-4 text-sm text-white font-medium">
                        {item.station_name}
                      </td>
                      <td className="px-6 py-4 text-right text-sm text-white">
                        {item.total_count}
                      </td>
                      <td className="px-6 py-4 text-right text-sm text-white">
                        {item.total_weight_kg}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        <div className="rounded-2xl border border-white/20 bg-white/10 backdrop-blur-md shadow-xl overflow-hidden">
          <div className="p-6 border-b border-white/10 flex items-center justify-between">
            <h2 className="text-xl font-bold text-white">
              Detaylı Talep Listesi
            </h2>
            {detailedRequests.length > 0 && (
              <button
                onClick={() => setDeleteAllConfirm(true)}
                disabled={deleteLoading}
                className="cursor-pointer rounded-lg bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700 transition-colors disabled:opacity-50"
              >
                Hepsini Sil
              </button>
            )}
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-white/5">
                <tr className="border-b border-white/10">
                  <th className="px-4 py-4 text-left text-sm font-semibold text-white/90">
                     a0
                  </th>
                  <th className="px-6 py-4 text-left text-sm font-semibold text-white/90">
                    Kullanıcı
                  </th>
                  <th className="px-6 py-4 text-left text-sm font-semibold text-white/90">
                    İstasyon
                  </th>
                  <th className="px-6 py-4 text-right text-sm font-semibold text-white/90">
                    Adet
                  </th>
                  <th className="px-6 py-4 text-right text-sm font-semibold text-white/90">
                    Kg
                  </th>
                  <th className="px-6 py-4 text-center text-sm font-semibold text-white/90">
                    Durum
                  </th>
                  <th className="px-4 py-4 text-right text-sm font-semibold text-white/90">
                     a0
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
                ) : alert ? (
                  <tr>
                    <td
                      colSpan={7}
                      className="px-6 py-6 text-center text-sm text-red-300"
                    >
                      {alert}
                    </td>
                  </tr>
                ) : detailedRequests.length === 0 ? (
                  <tr>
                    <td
                      colSpan={7}
                      className="px-6 py-6 text-center text-sm text-white/60"
                    >
                      Bu tarihte detay bulunamadı.
                    </td>
                  </tr>
                ) : (
                  detailedRequests.map((req, idx) => (
                    <tr
                      key={req.id}
                      className={`${
                        idx !== detailedRequests.length - 1
                          ? "border-b border-white/5"
                          : ""
                      } hover:bg-white/5 transition-colors group`}
                    >
                      <td className="px-4 py-4 text-left align-middle">
                        <button
                          onClick={() => setDeleteConfirmDemand(req)}
                          className="cursor-pointer text-red-400 hover:text-red-300 opacity-0 group-hover:opacity-100 transition-opacity"
                          title="Sil"
                        >
                          🗑️
                        </button>
                      </td>
                      <td className="px-6 py-4 text-sm text-white/80">
                        {req.user_email}
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
                      <td className="px-4 py-4 text-right" />
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        <p className="text-sm text-white/70">
          Toplam{" "}
          <span className="font-semibold text-white">
            {detailedRequests.length}
          </span>{" "}
          talep
        </p>
      </div>

      {/* Delete Confirm Modal */}
      {deleteConfirmDemand && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-2xl border border-white/10 bg-slate-950/70 p-6 shadow-2xl">
            <h3 className="text-xl font-bold text-white mb-2">Talebi Sil</h3>
            <p className="text-sm text-white/70 mb-6">
              Bu talebi silmek istediğinize emin misiniz?
            </p>
            <div className="flex justify-end gap-3">
              <button
                type="button"
                onClick={() => setDeleteConfirmDemand(null)}
                disabled={deleteLoading}
                className="cursor-pointer rounded-lg border border-white/20 bg-white/10 px-6 py-2 text-sm font-medium text-white hover:bg-white/15 transition-colors disabled:opacity-50"
              >
                İptal
              </button>
              <button
                type="button"
                onClick={handleConfirmDelete}
                disabled={deleteLoading}
                className="cursor-pointer rounded-lg bg-red-600 px-6 py-2 text-sm font-medium text-white hover:bg-red-700 transition-colors disabled:opacity-50"
              >
                {deleteLoading ? "Siliniyor..." : "Sil"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete All Confirm Modal */}
      {deleteAllConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-2xl border border-white/10 bg-slate-950/70 p-6 shadow-2xl">
            <h3 className="text-xl font-bold text-white mb-2">
              Tüm Talepleri Sil
            </h3>
            <p className="text-sm text-white/70 mb-6">
              Bu işlem geri alınamaz. Tüm talepler veritabanından silinecek.
              Emin misiniz?
            </p>
            <div className="flex justify-end gap-3">
              <button
                type="button"
                onClick={() => setDeleteAllConfirm(false)}
                disabled={deleteLoading}
                className="cursor-pointer rounded-lg border border-white/20 bg-white/10 px-6 py-2 text-sm font-medium text-white hover:bg-white/15 transition-colors disabled:opacity-50"
              >
                İptal
              </button>
              <button
                type="button"
                onClick={handleConfirmDeleteAll}
                disabled={deleteLoading}
                className="cursor-pointer rounded-lg bg-red-600 px-6 py-2 text-sm font-medium text-white hover:bg-red-700 transition-colors disabled:opacity-50"
              >
                {deleteLoading ? "Siliniyor..." : "Sil"}
              </button>
            </div>
          </div>
        </div>
      )}
    </AdminLayout>
  );
}
