"use client";

import React, { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { Space_Grotesk } from "next/font/google";

const spaceGrotesk = Space_Grotesk({
  subsets: ["latin"],
  weight: ["600", "700"],
  variable: "--font-space-grotesk",
});

function RouteLogo() {
  return (
    <div className="flex items-center gap-3">
      <div className="relative h-9 w-9 rounded-full bg-white/10 border border-white/20 grid place-items-center overflow-hidden">
        <svg
          viewBox="0 0 24 24"
          className="h-5 w-5 text-cyan-300"
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
        className={`text-sm font-bold text-white tracking-wide ${spaceGrotesk.className}`}
      >
        KOÜ Kargo Rota Planlama
      </span>
    </div>
  );
}

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const [showUserDropdown, setShowUserDropdown] = useState(false);
  const [userEmail, setUserEmail] = useState("admin@local");
  const openTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const closeTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    const storedEmail =
      localStorage.getItem("user_email") || localStorage.getItem("email");
    if (storedEmail) {
      setUserEmail(storedEmail);
    }
  }, []);

  const handleMouseEnter = () => {
    if (closeTimeoutRef.current) {
      clearTimeout(closeTimeoutRef.current);
      closeTimeoutRef.current = null;
    }
    if (!showUserDropdown) {
      openTimeoutRef.current = setTimeout(() => {
        setShowUserDropdown(true);
      }, 250);
    }
  };

  const handleMouseLeave = () => {
    if (openTimeoutRef.current) {
      clearTimeout(openTimeoutRef.current);
      openTimeoutRef.current = null;
    }
    closeTimeoutRef.current = setTimeout(() => {
      setShowUserDropdown(false);
    }, 180);
  };

  const handleLogout = () => {
    localStorage.removeItem("access_token");
    localStorage.removeItem("user_email");
    localStorage.removeItem("email");
    localStorage.removeItem("role");
    router.push("/login");
  };

  const navLinks = [
    { href: "/admin", label: "Dashboard" },
    { href: "/admin/stations", label: "İstasyonlar" },
    { href: "/admin/demands", label: "Talepler" },
    { href: "/admin/planning", label: "Planlama" },
    { href: "/admin/results", label: "Sonuçlar" },
    { href: "/admin/runs", label: "Geçmiş" },
  ];

  return (
    <div className="relative min-h-screen overflow-hidden bg-gradient-to-br from-[#0B1220] via-[#0F2A2E] to-[#0EA5E9]/20">
      {/* Subtle grid overlay */}
      <div className="pointer-events-none absolute inset-0 opacity-[0.05] [background-image:radial-gradient(transparent_95%,rgba(255,255,255,0.15)_100%)] [background-size:12px_12px]" />

      {/* Header */}
      <header className="relative z-20 border-b border-white/10 bg-white/5 backdrop-blur-md">
        <div className="mx-auto max-w-7xl px-4 py-4 flex items-center justify-between">
          {/* Logo */}
          <Link href="/admin">
            <RouteLogo />
          </Link>

          {/* Navigation */}
          <nav className="hidden md:flex items-center gap-1">
            {navLinks.map((link) => {
              const isActive = pathname === link.href;
              return (
                <Link
                  key={link.href}
                  href={link.href}
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                    isActive
                      ? "bg-white/10 text-white"
                      : "text-white/70 hover:text-white hover:bg-white/5"
                  }`}
                >
                  {link.label}
                </Link>
              );
            })}
          </nav>

          {/* User dropdown */}
          <div className="relative">
            <button
              onMouseEnter={handleMouseEnter}
              onMouseLeave={handleMouseLeave}
              className="flex items-center gap-2 px-3 py-2 rounded-lg bg-white/5 border border-white/10 hover:bg-white/10 transition-colors"
            >
              <div className="h-8 w-8 rounded-full bg-gradient-to-br from-amber-400 to-orange-500 grid place-items-center text-white text-sm font-semibold">
                {userEmail.charAt(0).toUpperCase()}
              </div>
              <span className="text-sm text-white/90">{userEmail}</span>
              <svg
                viewBox="0 0 24 24"
                className="h-4 w-4 text-white/70"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
              >
                <path
                  d="M6 9l6 6 6-6"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </button>

            {/* Dropdown */}
            {showUserDropdown && (
              <div
                onMouseEnter={handleMouseEnter}
                onMouseLeave={handleMouseLeave}
                className="absolute right-0 mt-2 w-48 rounded-lg border border-white/20 bg-slate-900/95 backdrop-blur-md shadow-xl overflow-hidden"
              >
                <button
                  onClick={handleLogout}
                  className="w-full text-left px-4 py-3 text-sm text-white/90 hover:bg-white/10 transition-colors"
                >
                  <div className="flex items-center gap-2">
                    <svg
                      viewBox="0 0 24 24"
                      className="h-4 w-4"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                    >
                      <path
                        d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4M16 17l5-5-5-5M21 12H9"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                    </svg>
                    Çıkış Yap
                  </div>
                </button>
              </div>
            )}
          </div>
        </div>
      </header>

      {/* Main content */}
      <main className="relative z-10 mx-auto max-w-7xl px-4 py-8">
        {children}
      </main>

      {/* Footer */}
      <footer className="relative z-10 mt-auto border-t border-white/10 bg-white/5 backdrop-blur-md py-4">
        <div className="mx-auto max-w-7xl px-4 text-center text-sm text-white/60">
          © 2025 KOÜ Kargo Rota Planlama. Tüm hakları saklıdır.
        </div>
      </footer>
    </div>
  );
}
