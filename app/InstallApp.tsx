"use client";

import { useEffect, useState } from "react";

type InstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed"; platform: string }>;
};

export default function InstallApp() {
  const [installEvent, setInstallEvent] = useState<InstallPromptEvent | null>(null);
  const [showHelp, setShowHelp] = useState(false);
  const [isInstalled, setIsInstalled] = useState(false);
  const [isIOS, setIsIOS] = useState(false);

  useEffect(() => {
    const standalone = window.matchMedia("(display-mode: standalone)").matches ||
      (window.navigator as Navigator & { standalone?: boolean }).standalone === true;
    setIsInstalled(standalone);
    setIsIOS(/iphone|ipad|ipod/i.test(window.navigator.userAgent));

    if ("serviceWorker" in navigator && process.env.NODE_ENV === "production") {
      navigator.serviceWorker.register("/sw.js").catch((error) => {
        console.error("BASE25 PRO service worker registration failed:", error);
      });
    }

    const handleBeforeInstall = (event: Event) => {
      event.preventDefault();
      setInstallEvent(event as InstallPromptEvent);
    };
    const handleInstalled = () => {
      setIsInstalled(true);
      setInstallEvent(null);
      setShowHelp(false);
    };

    window.addEventListener("beforeinstallprompt", handleBeforeInstall);
    window.addEventListener("appinstalled", handleInstalled);
    return () => {
      window.removeEventListener("beforeinstallprompt", handleBeforeInstall);
      window.removeEventListener("appinstalled", handleInstalled);
    };
  }, []);

  async function install() {
    if (!installEvent) {
      setShowHelp(true);
      return;
    }
    await installEvent.prompt();
    const choice = await installEvent.userChoice;
    if (choice.outcome === "accepted") setIsInstalled(true);
    setInstallEvent(null);
  }

  if (isInstalled) return null;

  return (
    <>
      <button type="button" onClick={install} aria-label="Install BASE25 PRO app" style={{
        position: "fixed", right: 18, bottom: "calc(18px + env(safe-area-inset-bottom))",
        zIndex: 9000, display: "inline-flex", alignItems: "center", gap: 9,
        padding: "13px 17px", margin: 0, border: "1px solid #d8f99a",
        borderRadius: 4, background: "#c5f36a", color: "#11170b",
        boxShadow: "0 8px 28px rgba(0,0,0,.42)", fontSize: 12, fontWeight: 800,
        letterSpacing: ".02em", cursor: "pointer"
      }}>
        <span aria-hidden="true">↓</span> Install BASE25 PRO
      </button>

      {showHelp && (
        <div role="presentation" onClick={() => setShowHelp(false)} style={{
          position: "fixed", inset: 0, zIndex: 10000, display: "grid",
          placeItems: "center", padding: 20, background: "rgba(0,0,0,.78)",
          backdropFilter: "blur(5px)"
        }}>
          <section role="dialog" aria-modal="true" aria-labelledby="install-title"
            onClick={(event) => event.stopPropagation()} style={{
              width: "min(100%, 420px)", padding: 25, border: "1px solid #536341",
              borderRadius: 8, background: "#131715", color: "#f3f5ef",
              boxShadow: "0 24px 80px rgba(0,0,0,.65)"
            }}>
            <div style={{ color: "#c5f36a", fontSize: 11, letterSpacing: ".14em" }}>TAKE THE COMPETITION WITH YOU</div>
            <h2 id="install-title" style={{ margin: "12px 0", fontSize: 23 }}>Install BASE25 PRO</h2>
            {isIOS ? (
              <ol style={{ paddingLeft: 21, color: "#c0c8c1", fontSize: 14, lineHeight: 1.9 }}>
                <li>Open this page in <b style={{ color: "#fff" }}>Safari</b>.</li>
                <li>Tap the <b style={{ color: "#fff" }}>Share</b> button.</li>
                <li>Choose <b style={{ color: "#fff" }}>Add to Home Screen</b>.</li>
                <li>Tap <b style={{ color: "#fff" }}>Add</b>.</li>
              </ol>
            ) : (
              <p style={{ color: "#c0c8c1", fontSize: 14, lineHeight: 1.8 }}>
                Open your browser menu and choose <b style={{ color: "#fff" }}>Install app</b> or
                <b style={{ color: "#fff" }}> Add to Home Screen</b>. The exact wording depends on your browser.
              </p>
            )}
            <button type="button" onClick={() => setShowHelp(false)} style={{
              width: "100%", margin: "12px 0 0", padding: 13, border: 0,
              borderRadius: 3, background: "#c5f36a", color: "#11170b",
              fontWeight: 800, cursor: "pointer"
            }}>Got it</button>
          </section>
        </div>
      )}
    </>
  );
}
