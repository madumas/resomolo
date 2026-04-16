/**
 * PWA update pipeline.
 * Expose une API découplée de main.tsx pour éviter les cycles d'import.
 * - `initPwaUpdate()` : appelé une fois depuis main.tsx, enregistre le SW.
 * - `onPwaUpdateAvailable(cb)` : App enregistre un callback déclenché quand
 *   une nouvelle version est prête (et que la cooldown 24h est respectée).
 * - `applyPwaUpdate()` : déclenche le rechargement avec la nouvelle version.
 * - `dismissPwaUpdate()` : mémorise "Plus tard" (silence le toast 24h).
 */
import { registerSW } from 'virtual:pwa-register';

const PWA_DISMISS_KEY = 'resomolo_pwa_update_dismissed_at';
const PWA_DISMISS_COOLDOWN_MS = 24 * 60 * 60 * 1000;

let onUpdateAvailable: (() => void) | null = null;
let updateSW: ((reloadPage?: boolean) => Promise<void>) | null = null;

export function initPwaUpdate(): void {
  if (updateSW) return;
  updateSW = registerSW({
    onNeedRefresh() {
      try {
        const lastDismiss = Number(localStorage.getItem(PWA_DISMISS_KEY) || '0');
        if (Date.now() - lastDismiss < PWA_DISMISS_COOLDOWN_MS) return;
      } catch { /* ignore */ }
      onUpdateAvailable?.();
    },
  });
}

export function onPwaUpdateAvailable(cb: () => void): void {
  onUpdateAvailable = cb;
}

export async function applyPwaUpdate(): Promise<void> {
  if (updateSW) await updateSW(true);
  else window.location.reload();
}

export function dismissPwaUpdate(): void {
  try { localStorage.setItem(PWA_DISMISS_KEY, String(Date.now())); } catch { /* ignore */ }
}
