"use client";

import { useState, useEffect } from "react";
import { usePathname } from "next/navigation";
import { AnimatePresence, motion } from "motion/react";
import { VscClose } from "react-icons/vsc";

export default function InstallPWA() {
  const pathname = usePathname();
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [showPopup, setShowPopup] = useState(false);

  useEffect(() => {
    // Hide everywhere on the admin panel
    if (pathname?.startsWith("/admin")) return;

    // Check local storage so we don't bother users sequentially if they are installed
    const isLocallyInstalled = localStorage.getItem("pwa-installed") === "true";
    if (isLocallyInstalled) return;

    // 24 Hour Cooldown check
    const dismissedTime = localStorage.getItem("pwa-prompt-dismissed");
    if (dismissedTime) {
      if (Date.now() - parseInt(dismissedTime) < 24 * 60 * 60 * 1000) {
        return; // less than 24 hours since last dismissed
      }
    }

    // Determine if the app is already installed
    const isStandalone = window.matchMedia("(display-mode: standalone)").matches || (window.navigator as any).standalone;
    if (isStandalone) {
      localStorage.setItem("pwa-installed", "true");
      return;
    }

    const installHandler = () => {
      localStorage.setItem("pwa-installed", "true");
      setShowPopup(false);
    };

    window.addEventListener("appinstalled", installHandler);

    const handler = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e);
      // Wait a bit before showing to not bombard the user instantly
      setTimeout(() => setShowPopup(true), 1500);
    };

    window.addEventListener("beforeinstallprompt", handler);

    return () => {
      window.removeEventListener("beforeinstallprompt", handler);
      window.removeEventListener("appinstalled", installHandler);
    };
  }, [pathname]);

  const handleInstallClick = async () => {
    if (!deferredPrompt) return;
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === "accepted") {
      localStorage.setItem("pwa-installed", "true");
      setShowPopup(false);
    }
    setDeferredPrompt(null);
  };

  const handleDismiss = () => {
    // Record dismissal time
    localStorage.setItem("pwa-prompt-dismissed", Date.now().toString());
    setShowPopup(false);
  };

  // If we are on admin routes, don't even mount AnimatePresence wrapper to save some overhead
  if (pathname?.startsWith("/admin")) return null;

  return (
    <AnimatePresence>
      {showPopup && (
        <motion.div
          initial={{ y: 50, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: 20, opacity: 0 }}
          transition={{ type: "spring", stiffness: 300, damping: 25 }}
          style={{
            position: "fixed",
            bottom: "20px",
            right: "20px",
            zIndex: 9999,
            background: "rgba(20, 10, 35, 0.85)",
            backdropFilter: "blur(16px)",
            WebkitBackdropFilter: "blur(16px)",
            border: "1px solid rgba(157, 0, 255, 0.3)",
            borderRadius: "16px",
            padding: "1rem",
            boxShadow: "0 10px 40px rgba(0, 0, 0, 0.5), 0 0 20px rgba(157, 0, 255, 0.15)",
            display: "flex",
            alignItems: "center",
            gap: "1rem",
            maxWidth: "350px",
          }}
        >
          <div
            style={{
              width: "44px",
              height: "44px",
              background: "linear-gradient(135deg, var(--primary) 0%, var(--accent) 100%)",
              borderRadius: "10px",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              flexShrink: 0,
              color: "#fff",
              fontWeight: 800,
              fontSize: "1.2rem",
            }}
          >
            CX
          </div>
          <div style={{ flex: 1 }}>
            <h4 style={{ margin: 0, fontSize: "0.95rem", fontWeight: 600 }}>Install CineXP</h4>
            <p style={{ margin: 0, fontSize: "0.8rem", opacity: 0.7, marginTop: "2px" }}>
              Add to home screen for a faster, full-screen experience.
            </p>
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
            <button
              onClick={handleInstallClick}
              style={{
                background: "var(--primary)",
                color: "#fff",
                border: "none",
                borderRadius: "6px",
                padding: "0.4rem 0.8rem",
                fontSize: "0.8rem",
                fontWeight: 600,
                cursor: "pointer",
              }}
            >
              Install
            </button>
            <button
              onClick={handleDismiss}
              style={{
                background: "transparent",
                color: "#fff",
                opacity: 0.5,
                border: "none",
                fontSize: "0.75rem",
                cursor: "pointer",
              }}
            >
              Maybe Later
            </button>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
