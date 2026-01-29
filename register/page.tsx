"use client";

import React, { useState, FormEvent } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Space_Grotesk } from "next/font/google";
import { apiPost } from "@/lib/api";

const spaceGrotesk = Space_Grotesk({
  subsets: ["latin"],
  weight: ["600", "700"],
  variable: "--font-space-grotesk",
});

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

type Errors = {
  email?: string;
  password?: string;
  confirm?: string;
};

export default function RegisterPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [role, setRole] = useState("USER");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [errors, setErrors] = useState<Errors>({});
  const [alert, setAlert] = useState<{
    type: "success" | "error";
    message: string;
  } | null>(null);
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setAlert(null);
    const nextErrors: Errors = {};
    if (!email.trim()) nextErrors.email = "Bu alan zorunlu";
    if (!password.trim()) nextErrors.password = "Bu alan zorunlu";
    if (!confirmPassword.trim()) nextErrors.confirm = "Bu alan zorunlu";
    if (password && confirmPassword && password !== confirmPassword) {
      nextErrors.confirm = "Şifreler eşleşmiyor";
    }
    setErrors(nextErrors);

    if (Object.keys(nextErrors).length > 0) {
      setAlert({
        type: "error",
        message: "Lütfen tüm alanları doğru şekilde doldurunuz.",
      });
      return;
    }

    setLoading(true);
    try {
      await apiPost<{ id: number; email: string; role: string }>(
        "/auth/register",
        {
          email,
          password,
          role,
        }
      );

      // Success
      setAlert({
        type: "success",
        message: "Başarılı! Kayıt oldunuz. Giriş sayfasına geçebilirsiniz.",
      });
      setEmail("");
      setPassword("");
      setConfirmPassword("");
      setErrors({});
      // Auto-redirect after 2 seconds (optional)
      setTimeout(() => {
        router.push("/login");
      }, 2000);
    } catch (err: unknown) {
      const error = err as Error;
      let message =
        error.message || "Kayıt başarısız. Lütfen tekrar deneyiniz.";

      // Map backend errors to Turkish messages
      if (message.includes("Kullanıcı adı veya e-posta kullanımda")) {
        message = "Kullanıcı adı veya e-posta kullanımda.";
      } else if (message.includes("Şifre en az 6 karakter")) {
        message = "Şifre en az 6 karakter olmalıdır.";
      } else if (message.includes("E-posta boş")) {
        message = "E-posta boş olamaz.";
      } else if (message.includes("Sunucuya bağlanılamadı")) {
        message =
          "Sunucuya bağlanılamadı. Backend (API) çalışıyor mu? http://localhost:8000/health";
      }

      setAlert({
        type: "error",
        message: message,
      });
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="relative min-h-screen overflow-hidden bg-gradient-to-br from-[#0B1220] via-[#0F2A2E] to-[#0EA5E9]/30">
      <div className="pointer-events-none absolute inset-0 opacity-[0.07] [background-image:radial-gradient(transparent_95%,rgba(255,255,255,0.15)_100%)] [background-size:12px_12px]" />
      <div className="pointer-events-none absolute -left-24 -top-24 h-64 w-64 rounded-full bg-gradient-to-br from-cyan-500/30 to-sky-400/20 blur-2xl" />

      <div className="absolute top-5 left-5 sm:top-8 sm:left-8 z-20">
        <RouteLogo />
      </div>

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
              <h1 className="text-2xl font-bold text-white">Kayıt Ol</h1>
              <p className="text-sm text-white/70">
                Hesap oluşturun ve kargo taleplerinizi yönetmeye başlayın.
              </p>
            </div>
          </div>

          <form
            className="mt-6 space-y-4"
            onSubmit={onSubmit}
            aria-describedby="form-errors"
          >
            <div>
              <label
                htmlFor="email"
                className="block text-sm font-medium text-white"
              >
                Kullanıcı Adı veya E-posta
              </label>
              <div className="mt-2 relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-white/70">
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

            <div>
              <label
                htmlFor="confirmPassword"
                className="block text-sm font-medium text-white"
              >
                Şifre (Tekrar)
              </label>
              <div className="mt-2 relative">
                <input
                  id="confirmPassword"
                  name="confirmPassword"
                  type={showConfirm ? "text" : "password"}
                  placeholder="••••••"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="w-full rounded-xl border border-white/20 bg-white/10 px-4 py-3 text-white placeholder:text-white/40 outline-none focus:ring-2 focus:ring-sky-400/60"
                  aria-invalid={!!errors.confirm}
                  aria-describedby={
                    errors.confirm ? "confirm-error" : undefined
                  }
                />
                <button
                  type="button"
                  onClick={() => setShowConfirm((v) => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 grid h-9 w-9 place-items-center rounded-lg border border-white/20 bg-white/5 text-white/80 hover:bg-white/10"
                  aria-label={showConfirm ? "Şifreyi gizle" : "Şifreyi göster"}
                >
                  {showConfirm ? (
                    <EyeOffIcon className="h-5 w-5" />
                  ) : (
                    <EyeIcon className="h-5 w-5" />
                  )}
                </button>
              </div>
              {errors.confirm && (
                <p
                  id="confirm-error"
                  className="mt-2 text-xs text-red-400"
                  aria-live="polite"
                >
                  {errors.confirm}
                </p>
              )}
            </div>

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
                  style={{ colorScheme: "dark" }}
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

            <div className="space-y-3">
              <button
                type="submit"
                disabled={loading}
                className="w-full rounded-xl bg-gradient-to-r from-sky-500 to-cyan-400 px-4 py-3 text-center font-semibold text-white shadow-sm hover:from-sky-600 hover:to-cyan-500 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? "Kayıt yapılıyor..." : "Hesap Oluştur"}
              </button>
            </div>
          </form>

          <div className="mt-6 text-center text-sm text-white/80">
            <span>Zaten hesabın var mı? </span>
            <Link href="/login" className="font-medium hover:underline">
              Giriş Yap
            </Link>
          </div>
        </div>
      </div>

      <footer className="relative z-10 mx-auto max-w-lg px-4 pb-6 text-center text-xs text-white/40">
        © 2025 KOÜ YazLab — Rota Planlama Sistemi
      </footer>
    </div>
  );
}
