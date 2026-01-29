"use client";

import React, { useState, FormEvent, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Space_Grotesk } from "next/font/google";
import { apiPost, checkBackendHealth } from "@/lib/api";

const spaceGrotesk = Space_Grotesk({
  subsets: ["latin"],
  weight: ["600", "700"],
  variable: "--font-space-grotesk",
});

const API_BASE = (
  process.env.NEXT_PUBLIC_API_URL || "http://127.0.0.1:8000"
).replace(/\/$/, "");

function RouteLogo() {
  return (
    <div className="flex items-center gap-3">
      <div className="relative h-10 w-10 rounded-full bg-white/10 border border-white/20 grid place-items-center overflow-hidden">
        <svg
          viewBox="0 0 24 24"
          className="h-6 w-6 text-cyan-300"
          aria-hidden="true"
        >
          <path
            d="M4 18c3-6 7-6 10-9"
            stroke="currentColor"
            strokeWidth="2"
            fill="none"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          <circle cx="14" cy="9" r="2" fill="currentColor" />
          <circle cx="4" cy="18" r="2" fill="currentColor" />
        </svg>
      </div>
      <span
        className={`text-base font-bold text-white tracking-wide ${spaceGrotesk.className}`}
      >
        KOÜ Kargo Rota Planlama
      </span>
    </div>
  );
}

function MailIcon({ className = "h-5 w-5" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} aria-hidden="true">
      <path
        d="M4 6h16v12H4z"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinejoin="round"
      />
      <path
        d="M22 7l-10 7L2 7"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
      />
    </svg>
  );
}

function EyeIcon({ className = "h-5 w-5" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} aria-hidden="true">
      <path
        d="M2 12s4-6 10-6 10 6 10 6-4 6-10 6S2 12 2 12z"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
      />
      <circle
        cx="12"
        cy="12"
        r="3"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
      />
    </svg>
  );
}

function EyeOffIcon({ className = "h-5 w-5" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} aria-hidden="true">
      <path
        d="M2 12s4-6 10-6c2.3 0 4.3.7 6 1.7M22 12s-4 6-10 6c-2.3 0-4.3-.7-6-1.7"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
      />
      <circle
        cx="12"
        cy="12"
        r="3"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
      />
      <path
        d="M3 3l18 18"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
      />
    </svg>
  );
}

function ChevronDownIcon({ className = "h-5 w-5" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} aria-hidden="true">
      <path
        d="M6 9l6 6 6-6"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState("USER");
  const [showPassword, setShowPassword] = useState(false);
  const [errors, setErrors] = useState<{ email?: string; password?: string }>(
    {}
  );
  const [alert, setAlert] = useState<{
    type: "success" | "error";
    message: string;
  } | null>(null);
  const [loading, setLoading] = useState(false);

  // Debug health check on mount
  useEffect(() => {
    const checkHealth = async () => {
      console.log("[API_BASE]", API_BASE);
      try {
        const isHealthy = await checkBackendHealth();
        if (isHealthy) {
          console.log("[HEALTH OK]");
        } else {
          console.warn("[HEALTH FAIL] Backend unreachable at", API_BASE);
        }
      } catch (e) {
        console.error("[HEALTH ERROR]", e);
      }
    };
    checkHealth();
  }, []);

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setAlert(null);
    const nextErrors: { email?: string; password?: string } = {};
    if (!email.trim()) nextErrors.email = "Bu alan zorunlu";
    if (!password.trim()) nextErrors.password = "Bu alan zorunlu";

    if (Object.keys(nextErrors).length > 0) {
      setErrors(nextErrors);
      return;
    }

    setLoading(true);
    try {
      const response = await apiPost<{
        access_token: string;
        token_type: string;
        user: { id: number; email: string; role: string };
      }>("/auth/login", { email, password });

      // Check role match
      if (response.user.role !== role) {
        setAlert({
          type: "error",
          message: "Seçtiğiniz rol ile hesabınızın rolü eşleşmiyor.",
        });
        setLoading(false);
        return;
      }

      // Store token, role, and user email
      localStorage.setItem("access_token", response.access_token);
      localStorage.setItem("role", response.user.role);
      localStorage.setItem("user_email", response.user.email);

      // Redirect based on role
      if (response.user.role === "ADMIN") {
        router.push("/admin");
      } else {
        router.push("/user");
      }
    } catch (err: unknown) {
      const error = err as Error;
      let errorMessage = "Giriş başarısız. Lütfen tekrar deneyiniz.";

      if (error.message) {
        if (
          error.message.includes("Sunucuya bağlanılamadı") ||
          error.message.includes("Failed to fetch")
        ) {
          errorMessage = `Sunucuya bağlanılamadı. Backend (API) çalışıyor mu? ${API_BASE}/health`;
        } else if (
          error.message.includes("401") ||
          error.message.includes("E-posta veya şifre")
        ) {
          errorMessage = "E-posta veya şifre hatalı.";
        } else if (error.message.includes("Validation error")) {
          errorMessage = "Lütfen e-postanız ve şifrenizi kontrol ediniz.";
        } else {
          errorMessage = error.message;
        }
      }

      setAlert({
        type: "error",
        message: errorMessage,
      });
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="relative min-h-screen overflow-hidden bg-gradient-to-br from-[#0B1220] via-[#0F2A2E] to-[#0EA5E9]/30">
      {/* Subtle grid/noise overlay */}
      <div className="pointer-events-none absolute inset-0 opacity-[0.07] [background-image:radial-gradient(transparent_95%,rgba(255,255,255,0.15)_100%)] [background-size:12px_12px]" />

      {/* Decorative route-like blur blob */}
      <div className="pointer-events-none absolute -left-24 -top-24 h-64 w-64 rounded-full bg-gradient-to-br from-cyan-500/30 to-sky-400/20 blur-2xl" />

      {/* Brand logo - top left, outside card */}
      <div className="absolute top-5 left-5 sm:top-8 sm:left-8 z-20">
        <RouteLogo />
      </div>

      {/* Center content */}
      <div className="relative z-10 mx-auto flex min-h-screen max-w-md items-center justify-center px-4 py-8">
        <div className="w-full rounded-2xl border border-white/20 bg-white/10 backdrop-blur-md shadow-xl p-5 sm:p-6">
          {/* Alert */}
          {alert && (
            <div
              className={`mb-4 rounded-xl border px-4 py-3 text-sm ${
                alert.type === "success"
                  ? "border-emerald-400/30 bg-emerald-500/15 text-emerald-200"
                  : "border-red-400/30 bg-red-500/15 text-red-200"
              }`}
              role="alert"
            >
              {alert.message}
            </div>
          )}

          {/* Header */}
          <div className="flex items-start justify-between">
            <div className="space-y-1.5">
              <h1 className="text-2xl font-bold text-white">Giriş Yap</h1>
              <p className="text-sm text-white/70">
                Kargo taleplerinizi görüntülemek ve yönetmek için hesabınıza
                giriş yapın.
              </p>
            </div>
            <span className="text-xs text-white/70 border border-white/20 rounded-full px-2 py-0.5 whitespace-nowrap">
              Beta
            </span>
          </div>

          {/* Form */}
          <form
            className="mt-6 space-y-4"
            onSubmit={onSubmit}
            aria-describedby="form-errors"
          >
            {/* Username/Email */}
            <div>
              <label
                htmlFor="email"
                className="block text-sm font-medium text-white"
              >
                Kullanıcı Adı veya E-posta
              </label>
              <div className="mt-2 relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-white/70">
                  {/* Switch between icons as you like */}
                  <MailIcon className="h-5 w-5" />
                </span>
                <input
                  id="email"
                  name="email"
                  type="email"
                  inputMode="email"
                  placeholder="ornek@kou.edu.tr"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full rounded-xl border border-white/20 bg-white/10 px-11 py-3 text-white placeholder:text-white/40 outline-none ring-offset-0 focus:ring-2 focus:ring-cyan-400/60"
                  aria-invalid={!!errors.email}
                  aria-describedby={errors.email ? "email-error" : undefined}
                />
              </div>
              {errors.email && (
                <p
                  id="email-error"
                  className="mt-2 text-xs text-red-400"
                  aria-live="polite"
                >
                  {errors.email}
                </p>
              )}
            </div>

            {/* Password */}
            <div>
              <label
                htmlFor="password"
                className="block text-sm font-medium text-white"
              >
                Şifre
              </label>
              <div className="mt-2 relative">
                <input
                  id="password"
                  name="password"
                  type={showPassword ? "text" : "password"}
                  placeholder="••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full rounded-xl border border-white/20 bg-white/10 px-4 py-3 text-white placeholder:text-white/40 outline-none focus:ring-2 focus:ring-sky-400/60"
                  aria-invalid={!!errors.password}
                  aria-describedby={
                    errors.password ? "password-error" : undefined
                  }
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((v) => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 grid h-9 w-9 place-items-center rounded-lg border border-white/20 bg-white/5 text-white/80 hover:bg-white/10"
                  aria-label={showPassword ? "Şifreyi gizle" : "Şifreyi göster"}
                >
                  {showPassword ? (
                    <EyeOffIcon className="h-5 w-5" />
                  ) : (
                    <EyeIcon className="h-5 w-5" />
                  )}
                </button>
              </div>
              <div className="mt-2 flex items-center justify-between">
                <p className="text-xs text-white/60">En az 6 karakter</p>
                {errors.password && (
                  <p
                    id="password-error"
                    className="text-xs text-red-400"
                    aria-live="polite"
                  >
                    {errors.password}
                  </p>
                )}
              </div>
            </div>

            {/* Role */}
            <div>
              <label
                htmlFor="role"
                className="block text-sm font-medium text-white"
              >
                Rol
              </label>
              <div className="mt-2 relative">
                <select
                  id="role"
                  name="role"
                  value={role}
                  onChange={(e) => setRole(e.target.value)}
                  className="w-full rounded-xl border border-white/20 bg-slate-900/40 backdrop-blur-sm px-4 py-3 pr-10 text-white appearance-none outline-none focus:outline-none focus:ring-2 focus:ring-sky-400/60 focus:border-transparent cursor-pointer"
                  style={{
                    colorScheme: "dark",
                  }}
                  aria-describedby="role-help"
                >
                  <option value="USER" className="bg-slate-900 text-white">
                    Kullanıcı
                  </option>
                  <option value="ADMIN" className="bg-slate-900 text-white">
                    Yönetici
                  </option>
                </select>
                <div className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-white/70">
                  <ChevronDownIcon className="h-5 w-5" />
                </div>
              </div>
              <p id="role-help" className="mt-2 text-xs text-white/60">
                Yönetici girişi yalnızca yetkili hesaplar içindir.
              </p>
            </div>

            {/* Submit */}
            <div className="space-y-3">
              <button
                type="submit"
                disabled={loading}
                className="w-full rounded-xl bg-gradient-to-r from-sky-500 to-cyan-400 px-4 py-3 text-center font-semibold text-white shadow-sm hover:from-sky-600 hover:to-cyan-500 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? "Giriş yapılıyor..." : "Giriş Yap"}
              </button>
            </div>
          </form>

          {/* Bottom links */}
          <div className="mt-6 text-center text-sm text-white/80">
            <span>Hesabın yok mu? </span>
            <Link href="/register" className="font-medium hover:underline">
              Kayıt Ol
            </Link>
          </div>
        </div>
      </div>

      {/* Footer */}
      <footer className="relative z-10 mx-auto max-w-lg px-4 pb-6 text-center text-xs text-white/40">
        © 2025 KOÜ YazLab — Rota Planlama Sistemi
      </footer>
    </div>
  );
}
