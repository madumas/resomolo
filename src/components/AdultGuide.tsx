import { useRef } from 'react';
import { UI_PRIMARY, UI_TEXT_PRIMARY, UI_TEXT_SECONDARY } from '../config/theme';
import { useModalBehavior } from '../hooks/useModalBehavior';

interface AdultGuideProps {
  onClose: () => void;
}

export function AdultGuide({ onClose }: AdultGuideProps) {
  const dialogRef = useRef<HTMLDivElement>(null);
  useModalBehavior(dialogRef, onClose);
  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Guide accompagnateur"
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(0,0,0,0.5)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 100,
      }}
      onClick={onClose}
    >
      <div
        style={{
          background: '#fff',
          borderRadius: 12,
          padding: 28,
          maxWidth: 520,
          width: '90%',
          maxHeight: '85vh',
          overflow: 'auto',
          boxShadow: '0 8px 32px rgba(0,0,0,0.2)',
        }}
        ref={dialogRef}
        onClick={e => e.stopPropagation()}
      >
        <h2 style={{ fontSize: 18, color: UI_PRIMARY, marginBottom: 16, fontWeight: 700 }}>
          Guide pour l'adulte accompagnateur
        </h2>

        <Section title="Le principe">
          L'enfant modélise visuellement un problème mathématique avant de le résoudre.
          L'outil ne calcule rien et ne valide rien — l'enfant fait tout le raisonnement.
        </Section>

        <Section title="Le flux">
          <ol style={{ paddingLeft: 20, display: 'flex', flexDirection: 'column', gap: 6 }}>
            <li><strong>Lire le problème</strong> — L'enfant surligne les nombres (clic sur les mots)</li>
            <li><strong>Placer des barres</strong> — Clic sur Barre, clic dans le canvas. Choisir la taille (1×-5×). Copier si « N fois plus ».</li>
            <li><strong>Nommer les barres</strong> — Clic sur une barre, puis « Nommer » pour écrire qui/quoi elle représente.</li>
            <li><strong>Écrire le calcul</strong> — Clic sur Calcul, clic dans le canvas. L'enfant tape l'opération ET le résultat.</li>
            <li><strong>Écrire la réponse</strong> — Clic sur Réponse, clic dans le canvas. L'enfant écrit une phrase-réponse.</li>
          </ol>
        </Section>

        <Section title="Votre rôle">
          <ul style={{ paddingLeft: 20, display: 'flex', flexDirection: 'column', gap: 4 }}>
            <li>N'intervenez que si l'enfant est bloqué depuis 30 secondes</li>
            <li>Utilisez des relances ouvertes : « Qu'est-ce que tu vois dans le problème? »</li>
            <li>Ne dites jamais « clique sur Barre » — laissez l'enfant trouver</li>
            <li>Si l'enfant se trompe, ne corrigez pas — le schéma EST le raisonnement, même s'il est faux</li>
          </ul>
        </Section>

        <Section title="Raccourcis">
          <ul style={{ paddingLeft: 20, display: 'flex', flexDirection: 'column', gap: 4 }}>
            <li><strong>Escape</strong> — Annuler / désélectionner</li>
            <li><strong>Ctrl+Z</strong> — Annuler la dernière action</li>
            <li><strong>Tout effacer</strong> — Vide les pièces, garde le problème</li>
            <li><strong>Reset</strong> — Tout effacer et relancer le tutoriel</li>
          </ul>
        </Section>

        <Section title="Ce qu'on observe">
          <ul style={{ paddingLeft: 20, display: 'flex', flexDirection: 'column', gap: 4 }}>
            <li>L'enfant commence-t-il par surligner?</li>
            <li>Quelle pièce choisit-il en premier?</li>
            <li>Nomme-t-il ses barres spontanément?</li>
            <li>L'adulte peut-il lire le raisonnement sans explication orale?</li>
            <li>Combien de coups de pouce sont nécessaires?</li>
          </ul>
        </Section>

        <button
          onClick={onClose}
          style={{
            marginTop: 20,
            width: '100%',
            padding: '12px',
            background: UI_PRIMARY,
            color: '#fff',
            border: 'none',
            borderRadius: 8,
            fontSize: 15,
            fontWeight: 600,
            cursor: 'pointer',
          }}
        >
          Compris — commencer
        </button>
      </div>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div style={{ marginBottom: 16 }}>
      <h3 style={{ fontSize: 14, color: UI_TEXT_PRIMARY, fontWeight: 600, marginBottom: 6 }}>{title}</h3>
      <div style={{ fontSize: 13, color: UI_TEXT_SECONDARY, lineHeight: 1.6 }}>{children}</div>
    </div>
  );
}
