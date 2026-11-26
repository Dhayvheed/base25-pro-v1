"use client";
import { useEffect, useState } from "react";

type InstallEvent = Event & { prompt: () => Promise<void>; userChoice: Promise<{ outcome: "accepted" | "dismissed" }> };

export default function PWAInstall() {
  const [installEvent, setInstallEvent] = useState<InstallEvent | null>(null);
  const [ios, setIos] = useState(false);
  const [standalone, setStandalone] = useState(false);
  const [showHelp, setShowHelp] = useState(false);

  useEffect(() => {
    const isIOS = /iphone|ipad|ipod/i.test(navigator.userAgent);
    const isStandalone = window.matchMedia("(display-mode: standalone)").matches || (navigator as Navigator & { standalone?: boolean }).standalone === true;
    setIos(isIOS);
    setStandalone(isStandalone);
    const onBeforeInstall = (event: Event) => {
      event.preventDefault();
      setInstallEvent(event as InstallEvent);
    };
    window.addEventListener("beforeinstallprompt", onBeforeInstall);
    if ("serviceWorker" in navigator) {
      navigator.serviceWorker.register("/sw.js").catch((error) => console.error("BASE25 PRO service worker registration failed:", error));
    }
    return () => window.removeEventListener("beforeinstallprompt", onBeforeInstall);
  }, []);

  if (standalone) return null;

  async function install() {
    if (installEvent) {
      await installEvent.prompt();
      const choice = await installEvent.userChoice;
      if (choice.outcome === "accepted") setStandalone(true);
      setInstallEvent(null);
      return;
    }
    setShowHelp(true);
  }

  return (
    <>
      <button type="button" className="pwa-install-button" onClick={install}>
        <span aria-hidden="true">↓</span> Install BASE25 PRO
      </button>
      {showHelp && (
        <div className="pwa-help-backdrop" role="presentation" onClick={() => setShowHelp(false)}>
          <section className="pwa-help" role="dialog" aria-modal="true" aria-labelledby="pwa-help-title" onClick={(event) => event.stopPropagation()}>
            <button type="button" className="pwa-help-close" onClick={() => setShowHelp(false)} aria-label="Close">×</button>
            <div className="eyebrow">TAKE THE COMPETITION WITH YOU</div>
            <h2 id="pwa-help-title">Install BASE25 PRO<span>.</span></h2>
            {ios ? (
              <ol><li>Open this page in <b>Safari</b>.</li><li>Tap the <b>Share</b> button.</li><li>Choose <b>Add to Home Screen</b>.</li><li>Tap <b>Add</b> to finish.</li></ol>
            ) : (
              <ol><li>Open this page in Chrome or another supported browser.</li><li>Open the browser menu (⋮).</li><li>Choose <b>Install app</b> or <b>Add to Home screen</b>.</li><li>Confirm the installation.</li></ol>
            )}
            <p>Your BASE25 PRO icon will appear on your phone. Open it from there whenever you're ready to compete.</p>
            <button type="button" className="pwa-help-done" onClick={() => setShowHelp(false)}>Got it</button>
          </section>
        </div>
      )}
    </>
  );
}
