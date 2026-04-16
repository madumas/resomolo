import { useState, useEffect, useCallback, useRef } from 'react';
import { UI_PRIMARY, UI_BORDER, UI_TEXT_SECONDARY } from '../config/theme';
import { MIN_BUTTON_SIZE_PX } from '../config/accessibility';
import { generateShareUrl, generateQrDataUrl, copyTextToClipboard, copyImageToClipboard, downloadDataUrl } from '../engine/share';
import { useModalBehavior } from '../hooks/useModalBehavior';
import type { Piece } from '../model/types';

interface SharePanelProps {
  problemText: string;
  pieces: Piece[];
  onClose: () => void;
}

export function SharePanel({ problemText, pieces, onClose }: SharePanelProps) {
  const [linkCopied, setLinkCopied] = useState(false);
  const [qrCopied, setQrCopied] = useState(false);
  const copyTimerRef = useRef<ReturnType<typeof setTimeout>>(undefined);
  useEffect(() => () => clearTimeout(copyTimerRef.current), []);
  const [qrDataUrl, setQrDataUrl] = useState<string | null>(null);
  const [shareUrl, setShareUrl] = useState('');
  const panelRef = useRef<HTMLDivElement>(null);

  // Intégration au stack modale commun : Escape, focus trap, focus restore.
  useModalBehavior(panelRef, onClose);

  useEffect(() => {
    const url = generateShareUrl(problemText, pieces);
    setShareUrl(url);
    generateQrDataUrl(url).then(setQrDataUrl).catch(() => {
      // QR trop grand pour le payload, ou erreur réseau — on laisse le lien seul.
      setQrDataUrl(null);
    });
  }, [problemText, pieces]);

  const handleCopyLink = useCallback(async () => {
    await copyTextToClipboard(shareUrl);
    setLinkCopied(true);
    clearTimeout(copyTimerRef.current);
    copyTimerRef.current = setTimeout(() => setLinkCopied(false), 2000);
  }, [shareUrl]);

  const handleCopyQr = useCallback(async () => {
    if (!qrDataUrl) return;
    const ok = await copyImageToClipboard(qrDataUrl);
    if (ok) {
      setQrCopied(true);
      clearTimeout(copyTimerRef.current);
      copyTimerRef.current = setTimeout(() => setQrCopied(false), 2000);
    }
  }, [qrDataUrl]);

  const handleDownloadQr = useCallback(() => {
    if (!qrDataUrl) return;
    downloadDataUrl(qrDataUrl, 'resomolo-qr.png');
  }, [qrDataUrl]);

  return (
    <div
      ref={panelRef}
      role="dialog"
      aria-modal="true"
      aria-label="Partager la modélisation"
      style={{
        padding: '12px 16px',
        paddingRight: 56,
        background: '#FFFFFF',
        borderBottom: `1px solid ${UI_BORDER}`,
        display: 'flex',
        gap: 16,
        alignItems: 'flex-start',
        flexWrap: 'wrap',
        position: 'relative' as const,
      }}
      onClick={e => e.stopPropagation()}
    >
      {/* Link section */}
      <div style={{ flex: 1, minWidth: 200 }}>
        <div style={{ fontSize: 11, color: UI_TEXT_SECONDARY, marginBottom: 4, textTransform: 'uppercase', letterSpacing: 0.5 }}>
          Lien de partage
        </div>
        <div style={{ display: 'flex', gap: 6 }}>
          <input
            type="text"
            readOnly
            value={shareUrl}
            onFocus={e => e.target.select()}
            style={{
              flex: 1,
              padding: '6px 8px',
              fontSize: 12,
              border: `1px solid ${UI_BORDER}`,
              borderRadius: 4,
              background: '#F6F4FA',
              color: '#1E1A2E',
              minWidth: 0,
            }}
          />
          <button
            onClick={handleCopyLink}
            style={{
              padding: '6px 12px',
              fontSize: 12,
              fontWeight: 600,
              background: linkCopied ? '#D1FAE5' : UI_PRIMARY,
              color: linkCopied ? '#065F46' : '#fff',
              border: 'none',
              borderRadius: 4,
              cursor: 'pointer',
              minHeight: MIN_BUTTON_SIZE_PX,
              whiteSpace: 'nowrap',
              transition: 'background 0.2s',
            }}
          >
            {linkCopied ? '✓ Copié!' : 'Copier le lien'}
          </button>
        </div>
        {shareUrl.length > 1500 && (
          <div style={{ fontSize: 10, color: '#9060C0', marginTop: 4 }}>
            Lien long ({shareUrl.length} car.) — vérifier qu'il fonctionne après envoi.
          </div>
        )}
      </div>

      {/* QR section */}
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6 }}>
        <div style={{ fontSize: 11, color: UI_TEXT_SECONDARY, textTransform: 'uppercase', letterSpacing: 0.5 }}>
          QR Code
        </div>
        {qrDataUrl ? (
          <img
            src={qrDataUrl}
            alt="QR Code"
            style={{ width: 120, height: 120, cursor: 'pointer', borderRadius: 4, border: `1px solid ${UI_BORDER}` }}
            onClick={handleCopyQr}
            title="Cliquer pour copier l'image"
          />
        ) : (
          <div style={{ width: 120, height: 120, background: '#F6F4FA', borderRadius: 4, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, color: UI_TEXT_SECONDARY }}>
            Chargement...
          </div>
        )}
        <div style={{ display: 'flex', gap: 6, fontSize: 11 }}>
          <button
            onClick={handleDownloadQr}
            style={{
              padding: '4px 8px',
              fontSize: 11,
              background: '#F6F4FA',
              border: `1px solid ${UI_BORDER}`,
              borderRadius: 4,
              cursor: 'pointer',
              color: UI_TEXT_SECONDARY,
            }}
          >
            Télécharger
          </button>
          <button
            onClick={handleCopyQr}
            style={{
              padding: '4px 8px',
              fontSize: 11,
              background: qrCopied ? '#D1FAE5' : '#F6F4FA',
              border: `1px solid ${qrCopied ? '#065F46' : UI_BORDER}`,
              borderRadius: 4,
              cursor: 'pointer',
              color: qrCopied ? '#065F46' : UI_TEXT_SECONDARY,
              transition: 'all 0.2s',
            }}
          >
            {qrCopied ? '✓ Copié!' : 'Copier'}
          </button>
        </div>
      </div>

      {/* Close button — top-right fixed position */}
      <button
        onClick={onClose}
        aria-label="Fermer le panneau de partage"
        style={{
          position: 'absolute',
          top: 8,
          right: 8,
          minWidth: MIN_BUTTON_SIZE_PX,
          minHeight: MIN_BUTTON_SIZE_PX,
          background: 'none',
          border: `1px solid ${UI_BORDER}`,
          borderRadius: 4,
          cursor: 'pointer',
          fontSize: 16,
          color: UI_TEXT_SECONDARY,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        ✕
      </button>
    </div>
  );
}
