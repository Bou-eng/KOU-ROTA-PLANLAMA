"use client";

import React, { useState, useEffect } from "react";
import AdminLayout from "@/components/admin/AdminLayout";
import { apiGet, apiPost, apiPatch, apiDelete } from "@/lib/api";

interface Station {
  id: number;
  name: string;
  lat: number;
  lon: number;
  is_active: boolean;
}

interface Edge {
  id: number;
  from_station_id: number;
  to_station_id: number;
  distance_km: number;
  is_bidirectional: boolean;
}

export default function StationsPage() {
  const [stationName, setStationName] = useState("");
  const [latitude, setLatitude] = useState("");
  const [longitude, setLongitude] = useState("");
  const [stations, setStations] = useState<Station[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [alert, setAlert] = useState<{
    type: "success" | "error" | "warning";
    message: string;
  } | null>(null);
  const [formErrors, setFormErrors] = useState<{
    name?: string;
    lat?: string;
    lon?: string;
  }>({});

  // Edit modal state
  const [editingStation, setEditingStation] = useState<Station | null>(null);
  const [editName, setEditName] = useState("");
  const [editLat, setEditLat] = useState("");
  const [editLon, setEditLon] = useState("");

  // New station edges modal state
  const [newStationId, setNewStationId] = useState<number | null>(null);
  const [edgeModalMode, setEdgeModalMode] = useState<
    "single" | "double" | null
  >(null);
  const [selectedStation1, setSelectedStation1] = useState<number | null>(null);
  const [selectedStation2, setSelectedStation2] = useState<number | null>(null);
  const [distance1, setDistance1] = useState("");
  const [distance2, setDistance2] = useState("");
  const [edgeSavingError, setEdgeSavingError] = useState<string | null>(null);
  const [edgeSavingLoading, setEdgeSavingLoading] = useState(false);

  // Delete confirm modal state
  const [deleteConfirmStation, setDeleteConfirmStation] =
    useState<Station | null>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);

  // Edges state for managing "Km Ekle/Düzenle" feature
  const [edges, setEdges] = useState<Edge[]>([]);
  const [kmModalStation, setKmModalStation] = useState<Station | null>(null);

  // Center station state
  const [centerStationId, setCenterStationId] = useState<number | null>(null);
  const [centerModalOpen, setCenterModalOpen] = useState(false);
  const [selectedCenterStation, setSelectedCenterStation] = useState<
    number | null
  >(null);
  const [centerSaving, setCenterSaving] = useState(false);

  useEffect(() => {
    loadStations();
    loadEdges();
    loadCenterStation();
  }, []);

  async function loadStations() {
    setLoading(true);
    try {
      const data = await apiGet<Station[]>("/admin/stations");
      setStations(data);
    } catch (error) {
      console.error("Error loading stations:", error);
      setAlert({ type: "error", message: "İstasyonlar yüklenemedi." });
    } finally {
      setLoading(false);
    }
  }

  async function loadEdges() {
    try {
      const data = await apiGet<Edge[]>("/graph/edges");
      setEdges(data);
    } catch (error) {
      console.error("Error loading edges:", error);
    }
  }

  async function loadCenterStation() {
    try {
      const data = await apiGet<{ center_station_id: number | null }>(
        "/settings/center-station"
      );
      setCenterStationId(data.center_station_id);
    } catch (error) {
      console.error("Error loading center station:", error);
    }
  }

  function validateForm(): boolean {
    const errors: { name?: string; lat?: string; lon?: string } = {};

    if (!stationName.trim()) {
      errors.name = "Zorunlu alan";
    }

    const latNum = parseFloat(latitude);
    if (isNaN(latNum) || latNum < -90 || latNum > 90) {
      errors.lat = "Geçersiz enlem";
    }

    const lonNum = parseFloat(longitude);
    if (isNaN(lonNum) || lonNum < -180 || lonNum > 180) {
      errors.lon = "Geçersiz boylam";
    }

    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setAlert(null);
    setFormErrors({});

    if (!validateForm()) {
      return;
    }

    const token = localStorage.getItem("access_token");
    if (!token) {
      setAlert({
        type: "error",
        message: "Oturum bulunamadı. Lütfen tekrar giriş yapın.",
      });
      setTimeout(() => {
        window.location.href = "/login";
      }, 1500);
      return;
    }

    setSubmitting(true);
    try {
      const newStation = await apiPost<Station>(
        "/admin/stations",
        {
          name: stationName.trim(),
          lat: parseFloat(latitude),
          lon: parseFloat(longitude),
        },
        token
      );

      setAlert({ type: "success", message: "İstasyon eklendi." });
      setStationName("");
      setLatitude("");
      setLongitude("");
      setFormErrors({});

      // Refresh list immediately
      await loadStations();
    } catch (error) {
      const err = error as Error;
      const errorMsg = err.message || "İstasyon eklenirken bir hata oluştu.";
      setAlert({ type: "error", message: errorMsg });
    } finally {
      setSubmitting(false);
    }
  }

  async function handleSaveEdges() {
    if (!kmModalStation) return;

    // Determine mode based on station count
    const stationCount = stations.length;

    if (stationCount === 1) {
      // Should not happen - button shouldn't open modal
      setAlert({
        type: "warning",
        message: "Herhangi bir yere bağlı olarak km eklenemez.",
      });
      closeEdgesModal();
      return;
    }

    if (stationCount === 2 || edgeModalMode === "single") {
      // Single edge mode: only station1 and distance1
      if (!selectedStation1) {
        setEdgeSavingError("İstasyon seçilmelidir.");
        return;
      }

      const d1 = parseFloat(distance1);
      if (isNaN(d1) || d1 <= 0) {
        setEdgeSavingError("Mesafe geçersiz.");
        return;
      }

      setEdgeSavingLoading(true);
      setEdgeSavingError(null);

      try {
        await apiPost("/graph/edges", {
          from_station_id: kmModalStation.id,
          to_station_id: selectedStation1,
          distance_km: d1,
          is_bidirectional: true,
        });

        setAlert({
          type: "success",
          message: "Mesafe kaydedildi.",
        });

        try {
          await apiPost("/graph/build-matrix", {});
        } catch (err) {
          console.warn("Matrix build failed (non-critical):", err);
        }

        closeEdgesModal();
        await loadStations();
        await loadEdges();
      } catch (error) {
        const err = error as Error;
        if ((err.message || "").includes("Bu bağlantı zaten mevcut")) {
          setEdgeSavingError(
            "Bu iki istasyon zaten bağlı. Değeri değiştirmek için 'Km Düzenle' kullanın."
          );
        } else {
          setEdgeSavingError(
            err.message || "Mesafe kaydedilirken hata oluştu."
          );
        }
      } finally {
        setEdgeSavingLoading(false);
      }
    } else {
      // Double edge mode: station1+2 and distance1+2
      if (!selectedStation1 || !selectedStation2) {
        setEdgeSavingError("Her iki istasyon seçilmelidir.");
        return;
      }

      if (selectedStation1 === selectedStation2) {
        setEdgeSavingError("Farklı istasyonlar seçmelisiniz.");
        return;
      }

      const d1 = parseFloat(distance1);
      const d2 = parseFloat(distance2);

      if (isNaN(d1) || d1 <= 0) {
        setEdgeSavingError("Mesafe 1 geçersiz.");
        return;
      }

      if (isNaN(d2) || d2 <= 0) {
        setEdgeSavingError("Mesafe 2 geçersiz.");
        return;
      }

      setEdgeSavingLoading(true);
      setEdgeSavingError(null);

      try {
        await apiPost("/graph/edges", {
          from_station_id: kmModalStation.id,
          to_station_id: selectedStation1,
          distance_km: d1,
          is_bidirectional: true,
        });

        await apiPost("/graph/edges", {
          from_station_id: kmModalStation.id,
          to_station_id: selectedStation2,
          distance_km: d2,
          is_bidirectional: true,
        });

        setAlert({
          type: "success",
          message: "Mesafeler kaydedildi.",
        });

        try {
          await apiPost("/graph/build-matrix", {});
        } catch (err) {
          console.warn("Matrix build failed (non-critical):", err);
        }

        closeEdgesModal();
        await loadStations();
        await loadEdges();
      } catch (error) {
        const err = error as Error;
        if ((err.message || "").includes("Bu bağlantı zaten mevcut")) {
          setEdgeSavingError(
            "Bu iki istasyon zaten bağlı. Değeri değiştirmek için 'Km Düzenle' kullanın."
          );
        } else {
          setEdgeSavingError(
            err.message || "Mesafe kaydedilirken hata oluştu."
          );
        }
      } finally {
        setEdgeSavingLoading(false);
      }
    }
  }

  function closeEdgesModal() {
    setKmModalStation(null);
    setNewStationId(null);
    setEdgeModalMode(null);
    setSelectedStation1(null);
    setSelectedStation2(null);
    setDistance1("");
    setDistance2("");
    setEdgeSavingError(null);
  }

  function handleCancelEdgesModal() {
    closeEdgesModal();
  }

  function hasEdges(stationId: number): boolean {
    return edges.some(
      (e) => e.from_station_id === stationId || e.to_station_id === stationId
    );
  }

  function getExistingEdges(stationId: number): Edge[] {
    return edges.filter(
      (e) => e.from_station_id === stationId || e.to_station_id === stationId
    );
  }

  function openKmModal(station: Station) {
    // Check station count
    if (stations.length === 1) {
      setAlert({
        type: "warning",
        message: "Herhangi bir yere bağlı olarak km eklenemez.",
      });
      return;
    }

    // Refresh edges to show the latest connections in the modal
    loadEdges();

    setKmModalStation(station);

    // Get existing edges for this station
    const existingEdges = getExistingEdges(station.id);

    if (stations.length === 2) {
      // Single mode
      setEdgeModalMode("single");
      const otherStation = stations.find((s) => s.id !== station.id);

      if (existingEdges.length > 0) {
        // Editing mode: pre-fill
        const edge = existingEdges[0];
        setSelectedStation1(otherStation?.id || null);
        setDistance1(edge.distance_km.toString());
      } else {
        // Add mode
        setSelectedStation1(otherStation?.id || null);
        setDistance1("");
      }
      setSelectedStation2(null);
      setDistance2("");
    } else {
      // Double mode (3+ stations)
      setEdgeModalMode("double");

      if (existingEdges.length >= 2) {
        // Editing mode: pre-fill first 2 edges
        const edge1 = existingEdges[0];
        const edge2 = existingEdges[1];

        setSelectedStation1(
          edge1.from_station_id === station.id
            ? edge1.to_station_id
            : edge1.from_station_id
        );
        setDistance1(edge1.distance_km.toString());

        setSelectedStation2(
          edge2.from_station_id === station.id
            ? edge2.to_station_id
            : edge2.from_station_id
        );
        setDistance2(edge2.distance_km.toString());
      } else if (existingEdges.length === 1) {
        // One edge exists, add second
        const edge1 = existingEdges[0];
        setSelectedStation1(
          edge1.from_station_id === station.id
            ? edge1.to_station_id
            : edge1.from_station_id
        );
        setDistance1(edge1.distance_km.toString());
        setSelectedStation2(null);
        setDistance2("");
      } else {
        // No edges yet
        setSelectedStation1(null);
        setDistance1("");
        setSelectedStation2(null);
        setDistance2("");
      }
    }

    setEdgeSavingError(null);
  }

  function openEditModal(station: Station) {
    setEditingStation(station);
    setEditName(station.name);
    setEditLat(station.lat.toString());
    setEditLon(station.lon.toString());
    setAlert(null);
  }

  function closeEditModal() {
    setEditingStation(null);
    setEditName("");
    setEditLat("");
    setEditLon("");
  }

  async function handleEditSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!editingStation) return;

    const latNum = parseFloat(editLat);
    const lonNum = parseFloat(editLon);

    if (!editName.trim()) {
      setAlert({ type: "error", message: "İstasyon adı boş olamaz." });
      return;
    }
    if (isNaN(latNum) || latNum < -90 || latNum > 90) {
      setAlert({ type: "error", message: "Geçersiz enlem (-90..90)." });
      return;
    }
    if (isNaN(lonNum) || lonNum < -180 || lonNum > 180) {
      setAlert({ type: "error", message: "Geçersiz boylam (-180..180)." });
      return;
    }

    try {
      await apiPatch<Station>(`/admin/stations/${editingStation.id}`, {
        name: editName.trim(),
        lat: latNum,
        lon: lonNum,
      });
      setAlert({ type: "success", message: "İstasyon güncellendi." });
      closeEditModal();
      await loadStations();
    } catch (error) {
      const err = error as Error;
      setAlert({
        type: "error",
        message: err.message || "Güncelleme başarısız.",
      });
    }
  }

  function openDeleteConfirmModal(station: Station) {
    setDeleteConfirmStation(station);
  }

  function closeDeleteConfirmModal() {
    setDeleteConfirmStation(null);
  }

  async function handleConfirmDelete() {
    if (!deleteConfirmStation) return;

    setDeleteLoading(true);
    try {
      await apiDelete(`/admin/stations/${deleteConfirmStation.id}`);
      setAlert({ type: "success", message: "İstasyon silindi." });
      closeDeleteConfirmModal();
      await loadStations();
    } catch (error) {
      const err = error as Error;
      setAlert({ type: "error", message: err.message || "Silme başarısız." });
    } finally {
      setDeleteLoading(false);
    }
  }

  function openCenterStationModal() {
    setSelectedCenterStation(centerStationId);
    setCenterModalOpen(true);
  }

  function closeCenterStationModal() {
    setCenterModalOpen(false);
    setSelectedCenterStation(null);
  }

  async function handleSaveCenterStation() {
    if (!selectedCenterStation) {
      setAlert({ type: "error", message: "Lütfen bir istasyon seçin." });
      return;
    }

    setCenterSaving(true);
    try {
      await apiPost("/settings/center-station", {
        center_station_id: selectedCenterStation,
      });
      setCenterStationId(selectedCenterStation);
      setAlert({ type: "success", message: "Merkez istasyon güncellendi." });
    } catch (error) {
      const err = error as Error;
      setAlert({
        type: "error",
        message: err.message || "Merkez istasyon ayarlanamadı.",
      });
    } finally {
      setCenterSaving(false);
      // Close modal on both success and error
      closeCenterStationModal();
    }
  }

  // Get list of active stations excluding the one being added edges for
  const availableStations = stations.filter(
    (s) => s.is_active && s.id !== kmModalStation?.id
  );
  const modalEdges = kmModalStation ? getExistingEdges(kmModalStation.id) : [];

  return (
    <AdminLayout>
      <div className="space-y-6">
        {/* Alert */}
        {alert && (
          <div
            className={`rounded-xl border px-4 py-3 ${
              alert.type === "success"
                ? "border-emerald-400/30 bg-emerald-500/10 text-emerald-300"
                : alert.type === "error"
                ? "border-red-400/30 bg-red-500/10 text-red-300"
                : "border-yellow-400/30 bg-yellow-500/10 text-yellow-300"
            }`}
          >
            {alert.message}
          </div>
        )}

        {/* Page title */}
        <div>
          <h1 className="text-3xl font-bold text-white">İstasyon Yönetimi</h1>
          <p className="mt-2 text-sm text-white/70">
            İstasyonları ekleyin, düzenleyin veya yönetin
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Add station form */}
          <div className="lg:col-span-1">
            <div className="rounded-2xl border border-white/20 bg-white/10 backdrop-blur-md p-6 shadow-xl">
              <h2 className="text-xl font-bold text-white mb-4">
                Yeni İstasyon Ekle
              </h2>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-white mb-2">
                    İstasyon Adı <span className="text-red-400">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={stationName}
                    onChange={(e) => {
                      setStationName(e.target.value);
                      if (formErrors.name)
                        setFormErrors({ ...formErrors, name: undefined });
                    }}
                    placeholder="Örn: Merkez İstasyon"
                    className="w-full rounded-xl border border-white/20 bg-white/10 px-4 py-3 text-white placeholder:text-white/40 outline-none focus:ring-2 focus:ring-cyan-400/60"
                  />
                  {formErrors.name && (
                    <p className="mt-1 text-xs text-red-400">
                      {formErrors.name}
                    </p>
                  )}
                </div>
                <div>
                  <label className="block text-sm font-medium text-white mb-2">
                    Enlem (Latitude) <span className="text-red-400">*</span>
                  </label>
                  <input
                    type="number"
                    required
                    step="0.0001"
                    value={latitude}
                    onChange={(e) => {
                      setLatitude(e.target.value);
                      if (formErrors.lat)
                        setFormErrors({ ...formErrors, lat: undefined });
                    }}
                    placeholder="Örn: 41.0082"
                    className="w-full rounded-xl border border-white/20 bg-white/10 px-4 py-3 text-white placeholder:text-white/40 outline-none focus:ring-2 focus:ring-cyan-400/60"
                  />
                  {formErrors.lat && (
                    <p className="mt-1 text-xs text-red-400">
                      {formErrors.lat}
                    </p>
                  )}
                </div>
                <div>
                  <label className="block text-sm font-medium text-white mb-2">
                    Boylam (Longitude) <span className="text-red-400">*</span>
                  </label>
                  <input
                    type="number"
                    required
                    step="0.0001"
                    value={longitude}
                    onChange={(e) => {
                      setLongitude(e.target.value);
                      if (formErrors.lon)
                        setFormErrors({ ...formErrors, lon: undefined });
                    }}
                    placeholder="Örn: 28.9784"
                    className="w-full rounded-xl border border-white/20 bg-white/10 px-4 py-3 text-white placeholder:text-white/40 outline-none focus:ring-2 focus:ring-cyan-400/60"
                  />
                  {formErrors.lon && (
                    <p className="mt-1 text-xs text-red-400">
                      {formErrors.lon}
                    </p>
                  )}
                </div>
                <button
                  type="submit"
                  disabled={submitting}
                  className="w-full cursor-pointer rounded-xl bg-gradient-to-r from-sky-500 to-cyan-400 px-4 py-3 text-center font-semibold text-white shadow-lg hover:from-sky-600 hover:to-cyan-500 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {submitting ? "Ekleniyor..." : "Ekle"}
                </button>
              </form>
            </div>
          </div>

          {/* Stations table */}
          <div className="lg:col-span-2">
            <div className="rounded-2xl border border-white/20 bg-white/10 backdrop-blur-md shadow-xl overflow-hidden">
              <div className="p-6 border-b border-white/10 flex items-center justify-between">
                <h2 className="text-xl font-bold text-white">
                  İstasyon Listesi
                </h2>
                <button
                  onClick={openCenterStationModal}
                  className={`cursor-pointer px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 ${
                    centerStationId
                      ? "bg-emerald-500/20 text-emerald-300 hover:bg-emerald-500/30 border border-emerald-400/30"
                      : "bg-cyan-500/20 text-cyan-300 hover:bg-cyan-500/30 border border-cyan-400/30"
                  }`}
                >
                  {centerStationId
                    ? "⭐ Merkez istasyon düzenle"
                    : "Merkez istasyon ayarla"}
                </button>
              </div>

              {loading ? (
                <div className="p-8 text-center text-white/70">
                  Yükleniyor...
                </div>
              ) : stations.length === 0 ? (
                <div className="p-8 text-center text-white/70">
                  Henüz istasyon eklenmemiş
                </div>
              ) : (
                <>
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead className="bg-white/5">
                        <tr className="border-b border-white/10">
                          <th className="px-6 py-4 text-left text-sm font-semibold text-white/90">
                            Ad
                          </th>
                          <th className="px-6 py-4 text-right text-sm font-semibold text-white/90">
                            Enlem
                          </th>
                          <th className="px-6 py-4 text-right text-sm font-semibold text-white/90">
                            Boylam
                          </th>
                          <th className="px-6 py-4 text-right text-sm font-semibold text-white/90">
                            İşlem
                          </th>
                        </tr>
                      </thead>
                      <tbody>
                        {stations.map((station, idx) => (
                          <tr
                            key={station.id}
                            className={`${
                              idx !== stations.length - 1
                                ? "border-b border-white/5"
                                : ""
                            } hover:bg-white/5 transition-colors group`}
                          >
                            <td className="px-6 py-4 text-sm text-white font-medium">
                              <div className="flex items-center gap-3">
                                <button
                                  onClick={() =>
                                    openDeleteConfirmModal(station)
                                  }
                                  className="cursor-pointer text-red-500 opacity-0 group-hover:opacity-100 transition-opacity hover:text-red-400"
                                  title="Sil"
                                >
                                  🗑️
                                </button>
                                <span>{station.name}</span>
                              </div>
                            </td>
                            <td className="px-6 py-4 text-right text-sm text-white/80">
                              {station.lat.toFixed(4)}
                            </td>
                            <td className="px-6 py-4 text-right text-sm text-white/80">
                              {station.lon.toFixed(4)}
                            </td>
                            <td className="px-6 py-4 text-right">
                              <div className="flex items-center justify-end gap-2">
                                <button
                                  onClick={() => openEditModal(station)}
                                  className="cursor-pointer text-sm text-cyan-400 hover:text-cyan-300 font-medium transition-colors"
                                >
                                  Düzenle
                                </button>
                                <button
                                  onClick={() => openKmModal(station)}
                                  className="cursor-pointer text-sm text-emerald-400 hover:text-emerald-300 font-medium transition-colors"
                                >
                                  {hasEdges(station.id)
                                    ? "Km Düzenle"
                                    : "Km Ekle"}
                                </button>
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                  <div className="border-t border-white/10 bg-white/5 px-6 py-4">
                    <p className="text-sm text-white/70">
                      Toplam{" "}
                      <span className="font-semibold text-white">
                        {stations.length}
                      </span>{" "}
                      istasyon
                    </p>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>

        {/* Edit Modal */}
        {editingStation && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm">
            <div className="w-full max-w-md rounded-2xl border border-white/20 bg-slate-900 p-6 shadow-2xl">
              <h3 className="text-xl font-bold text-white mb-4">
                İstasyonu Düzenle
              </h3>
              <form onSubmit={handleEditSubmit} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-white/90 mb-1">
                    İstasyon Adı
                  </label>
                  <input
                    type="text"
                    value={editName}
                    onChange={(e) => setEditName(e.target.value)}
                    className="w-full rounded-lg border border-white/20 bg-slate-900/60 px-4 py-2 text-white placeholder-white/50 focus:border-cyan-400 focus:outline-none"
                    placeholder="Örn: İzmit İstasyonu"
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-white/90 mb-1">
                      Enlem
                    </label>
                    <input
                      type="text"
                      value={editLat}
                      onChange={(e) => setEditLat(e.target.value)}
                      className="w-full rounded-lg border border-white/20 bg-slate-900/60 px-4 py-2 text-white placeholder-white/50 focus:border-cyan-400 focus:outline-none"
                      placeholder="40.77"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-white/90 mb-1">
                      Boylam
                    </label>
                    <input
                      type="text"
                      value={editLon}
                      onChange={(e) => setEditLon(e.target.value)}
                      className="w-full rounded-lg border border-white/20 bg-slate-900/60 px-4 py-2 text-white placeholder-white/50 focus:border-cyan-400 focus:outline-none"
                      placeholder="29.92"
                    />
                  </div>
                </div>
                <div className="flex justify-end gap-3 pt-2">
                  <button
                    type="button"
                    onClick={closeEditModal}
                    className="cursor-pointer rounded-lg border border-white/20 bg-white/10 px-6 py-2 text-sm font-medium text-white hover:bg-white/15 transition-colors"
                  >
                    İptal
                  </button>
                  <button
                    type="submit"
                    className="cursor-pointer rounded-lg bg-blue-600 px-6 py-2 text-sm font-medium text-white hover:bg-blue-700 transition-colors"
                  >
                    Kaydet
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Add Edges Modal */}
        {kmModalStation && edgeModalMode && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
            <div className="w-full max-w-md rounded-2xl border border-white/10 bg-slate-950/70 p-6 shadow-2xl">
              <h3 className="text-xl font-bold text-white mb-4">
                {edgeModalMode === "single"
                  ? "Mesafe Tanımla (1 bağlantı)"
                  : "Mesafe Tanımla (2 bağlantı)"}
              </h3>

              {edgeSavingError && (
                <div className="mb-4 rounded-lg border border-red-400/30 bg-red-500/10 p-3 text-sm text-red-300">
                  {edgeSavingError}
                </div>
              )}

              {kmModalStation && (
                <div className="mb-4 rounded-lg border border-white/15 bg-white/5 p-3">
                  <div className="mb-2 text-sm font-semibold text-white/80">
                    {kmModalStation.name} mevcut bağlantılar
                  </div>
                  {modalEdges.length === 0 ? (
                    <p className="text-xs text-white/60">
                      Kayıtlı bağlantı yok.
                    </p>
                  ) : (
                    <ul className="space-y-1 text-xs text-white/80">
                      {modalEdges.map((edge) => {
                        const connectedId =
                          edge.from_station_id === kmModalStation.id
                            ? edge.to_station_id
                            : edge.from_station_id;
                        const connectedName =
                          stations.find((s) => s.id === connectedId)?.name ||
                          `İstasyon ${connectedId}`;
                        return (
                          <li
                            key={edge.id}
                            className="flex items-center justify-between"
                          >
                            <span>{connectedName}</span>
                            <span className="text-white/60">
                              {edge.distance_km} km{" "}
                              {edge.is_bidirectional ? "(çift yön)" : ""}
                            </span>
                          </li>
                        );
                      })}
                    </ul>
                  )}
                </div>
              )}

              <div className="space-y-4">
                {/* Station 1 - Always shown */}
                <div>
                  <label className="block text-sm font-medium text-white/90 mb-2">
                    Yakın İstasyon {edgeModalMode === "double" ? "1" : ""}
                  </label>
                  <select
                    value={selectedStation1 || ""}
                    onChange={(e) =>
                      setSelectedStation1(
                        e.target.value ? parseInt(e.target.value) : null
                      )
                    }
                    className="w-full cursor-pointer rounded-lg border border-white/20 bg-slate-900/60 px-4 py-2 text-white focus:border-cyan-400 focus:outline-none focus:ring-2 focus:ring-cyan-400/40"
                  >
                    <option value="">-- Seç --</option>
                    {availableStations.map((s) => (
                      <option
                        key={s.id}
                        value={s.id}
                        className="bg-slate-900 text-white"
                      >
                        {s.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-white/90 mb-2">
                    Uzaklık {edgeModalMode === "double" ? "1" : ""} (km)
                  </label>
                  <input
                    type="number"
                    step="0.1"
                    min="0"
                    value={distance1}
                    onChange={(e) => setDistance1(e.target.value)}
                    className="w-full rounded-lg border border-white/20 bg-white/10 px-4 py-2 text-white placeholder-white/50 focus:border-cyan-400 focus:outline-none"
                    placeholder="Örn: 15.5"
                  />
                </div>

                {/* Station 2 - Only shown in double mode */}
                {edgeModalMode === "double" && (
                  <>
                    <div>
                      <label className="block text-sm font-medium text-white/90 mb-2">
                        Yakın İstasyon 2
                      </label>
                      <select
                        value={selectedStation2 || ""}
                        onChange={(e) =>
                          setSelectedStation2(
                            e.target.value ? parseInt(e.target.value) : null
                          )
                        }
                        className="w-full cursor-pointer rounded-lg border border-white/20 bg-slate-900/60 px-4 py-2 text-white focus:border-cyan-400 focus:outline-none focus:ring-2 focus:ring-cyan-400/40"
                      >
                        <option value="">-- Seç --</option>
                        {availableStations
                          .filter((s) => s.id !== selectedStation1)
                          .map((s) => (
                            <option
                              key={s.id}
                              value={s.id}
                              className="bg-slate-900 text-white"
                            >
                              {s.name}
                            </option>
                          ))}
                      </select>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-white/90 mb-2">
                        Uzaklık 2 (km)
                      </label>
                      <input
                        type="number"
                        step="0.1"
                        min="0"
                        value={distance2}
                        onChange={(e) => setDistance2(e.target.value)}
                        className="w-full rounded-lg border border-white/20 bg-white/10 px-4 py-2 text-white placeholder-white/50 focus:border-cyan-400 focus:outline-none"
                        placeholder="Örn: 20.0"
                      />
                    </div>
                  </>
                )}
              </div>

              <div className="flex justify-end gap-3 pt-6">
                <button
                  type="button"
                  onClick={handleCancelEdgesModal}
                  disabled={edgeSavingLoading}
                  className="cursor-pointer rounded-lg border border-white/20 bg-white/10 px-6 py-2 text-sm font-medium text-white hover:bg-white/15 transition-colors disabled:opacity-50"
                >
                  İptal
                </button>
                <button
                  type="button"
                  onClick={handleSaveEdges}
                  disabled={edgeSavingLoading}
                  className="cursor-pointer rounded-lg bg-blue-600 px-6 py-2 text-sm font-medium text-white hover:bg-blue-700 transition-colors disabled:opacity-50"
                >
                  {edgeSavingLoading ? "Kaydediliyor..." : "Kaydet"}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Delete Confirm Modal */}
        {deleteConfirmStation && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
            <div className="w-full max-w-md rounded-2xl border border-white/10 bg-slate-950/70 p-6 shadow-2xl">
              <h3 className="text-xl font-bold text-white mb-2">
                İstasyonu Sil
              </h3>
              <p className="text-sm text-white/70 mb-6">
                Bu istasyonu silmek istediğinize emin misiniz? Bu işlem geri
                alınamaz.
              </p>

              <div className="flex justify-end gap-3">
                <button
                  type="button"
                  onClick={closeDeleteConfirmModal}
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

        {/* Center Station Modal */}
        {centerModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
            <div className="w-full max-w-md rounded-2xl border border-white/20 bg-slate-900/95 p-6 shadow-2xl">
              <h3 className="text-xl font-bold text-white mb-4">
                Merkez İstasyon Seç
              </h3>
              <p className="text-sm text-white/70 mb-4">
                Planlama için kullanılacak merkez istasyonu seçin.
              </p>

              <div className="mb-6">
                <label className="block text-sm font-medium text-white/90 mb-2">
                  İstasyon
                </label>
                <select
                  value={selectedCenterStation || ""}
                  onChange={(e) =>
                    setSelectedCenterStation(
                      e.target.value ? parseInt(e.target.value) : null
                    )
                  }
                  className="w-full cursor-pointer rounded-lg border border-white/20 bg-slate-900/60 px-4 py-2 text-white focus:border-cyan-400 focus:outline-none focus:ring-2 focus:ring-cyan-400/40"
                >
                  <option value="">-- İstasyon seçin --</option>
                  {stations
                    .filter((s) => s.is_active)
                    .map((s) => (
                      <option
                        key={s.id}
                        value={s.id}
                        className="bg-slate-900 text-white"
                      >
                        {s.name}
                      </option>
                    ))}
                </select>
              </div>

              <div className="flex justify-end gap-3">
                <button
                  type="button"
                  onClick={closeCenterStationModal}
                  disabled={centerSaving}
                  className="cursor-pointer rounded-lg border border-white/20 bg-white/10 px-6 py-2 text-sm font-medium text-white hover:bg-white/15 transition-colors disabled:opacity-50"
                >
                  İptal
                </button>
                <button
                  onClick={handleSaveCenterStation}
                  disabled={centerSaving}
                  className="cursor-pointer rounded-lg bg-gradient-to-r from-sky-500 to-cyan-400 px-6 py-2 text-sm font-semibold text-white hover:from-sky-600 hover:to-cyan-500 transition-all disabled:opacity-50"
                >
                  {centerSaving ? "Kaydediliyor..." : "Kaydet"}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </AdminLayout>
  );
}
