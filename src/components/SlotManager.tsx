import { useState } from 'react';
import type { SlotRegistry, SlotMetadata } from '../model/slots';
import { MAX_SLOTS } from '../model/slots';
import { UI_PRIMARY, UI_BORDER, UI_TEXT_SECONDARY, UI_TEXT_PRIMARY, UI_DESTRUCTIVE } from '../config/theme';
import { MIN_BUTTON_SIZE_PX } from '../config/accessibility';

interface SlotManagerProps {
  registry: SlotRegistry;
  activeSlotId: string | null;
  onSwitchSlot: (id: string) => void;
  onCreateSlot: () => void;
  onDeleteSlot: (id: string) => void;
  onRenameSlot: (id: string, name: string) => void;
  onExportSlot?: (id: string) => void;
  onClose: () => void;
}

export function SlotManager({
  registry,
  activeSlotId,
  onSwitchSlot,
  onCreateSlot,
  onDeleteSlot,
  onRenameSlot,
  onExportSlot,
  onClose,
}: SlotManagerProps) {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState('');
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const startRename = (slot: SlotMetadata) => {
    setEditingId(slot.id);
    setEditName(slot.name);
    setDeletingId(null);
  };

  const commitRename = () => {
    if (editingId && editName.trim()) {
      onRenameSlot(editingId, editName.trim());
    }
    setEditingId(null);
    setEditName('');
  };

  const formatDate = (ts: number) => {
    try {
      return new Date(ts).toLocaleDateString('fr-CA', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      });
    } catch {
      return '';
    }
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Mes travaux"
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
          maxWidth: 480,
          width: '90%',
          maxHeight: '85vh',
          overflow: 'auto',
          boxShadow: '0 8px 32px rgba(0,0,0,0.2)',
        }}
        onClick={e => e.stopPropagation()}
      >
        <h2 style={{ fontSize: 18, color: UI_PRIMARY, marginBottom: 20, fontWeight: 700 }}>
          Mes travaux
        </h2>

        {/* Nouveau travail button */}
        <button
          onClick={onCreateSlot}
          disabled={registry.slots.length >= MAX_SLOTS}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            width: '100%',
            padding: '10px 14px',
            marginBottom: 16,
            background: registry.slots.length >= MAX_SLOTS ? '#ECEAF0' : '#EDE0FA',
            border: `2px solid ${registry.slots.length >= MAX_SLOTS ? UI_BORDER : UI_PRIMARY}`,
            borderRadius: 8,
            fontSize: 14,
            fontWeight: 600,
            color: registry.slots.length >= MAX_SLOTS ? '#9CA3AF' : UI_PRIMARY,
            cursor: registry.slots.length >= MAX_SLOTS ? 'default' : 'pointer',
            minHeight: MIN_BUTTON_SIZE_PX,
          }}
        >
          <FolderPlusIcon />
          Nouveau travail
          {registry.slots.length >= MAX_SLOTS && (
            <span style={{ fontSize: 11, fontWeight: 400, marginLeft: 'auto' }}>
              (max {MAX_SLOTS})
            </span>
          )}
        </button>

        {/* Slot list */}
        {registry.slots.length === 0 ? (
          <p style={{ fontSize: 13, color: UI_TEXT_SECONDARY, textAlign: 'center', padding: '20px 0' }}>
            Aucune modélisation enregistrée.
          </p>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {registry.slots.map(slot => {
              const isActive = slot.id === activeSlotId;
              const isEditing = editingId === slot.id;
              const isDeleting = deletingId === slot.id;

              return (
                <div
                  key={slot.id}
                  style={{
                    display: 'flex',
                    flexDirection: 'column',
                    padding: '10px 12px',
                    borderRadius: 8,
                    border: `2px solid ${isActive ? UI_PRIMARY : UI_BORDER}`,
                    background: isActive ? '#F5F0FC' : '#fff',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, minHeight: 32 }}>
                    {/* Slot name (editable) */}
                    {isEditing ? (
                      <input
                        autoFocus
                        value={editName}
                        onChange={e => setEditName(e.target.value)}
                        onBlur={commitRename}
                        onKeyDown={e => {
                          if (e.key === 'Enter') commitRename();
                          if (e.key === 'Escape') { setEditingId(null); setEditName(''); }
                        }}
                        style={{
                          flex: 1,
                          fontSize: 14,
                          fontWeight: 600,
                          padding: '4px 8px',
                          borderRadius: 4,
                          border: `1px solid ${UI_PRIMARY}`,
                          outline: 'none',
                          color: UI_TEXT_PRIMARY,
                        }}
                      />
                    ) : (
                      <span
                        style={{
                          flex: 1,
                          fontSize: 14,
                          fontWeight: 600,
                          color: UI_TEXT_PRIMARY,
                          cursor: 'pointer',
                        }}
                        onClick={() => startRename(slot)}
                        title="Cliquer pour renommer"
                      >
                        {slot.name}
                      </span>
                    )}

                    {/* "En cours" badge */}
                    {isActive && (
                      <span style={{
                        fontSize: 11,
                        fontWeight: 600,
                        color: UI_PRIMARY,
                        background: '#D6D0F5',
                        padding: '2px 8px',
                        borderRadius: 10,
                        whiteSpace: 'nowrap',
                      }}>
                        En cours
                      </span>
                    )}
                  </div>

                  {/* Date */}
                  <div style={{ fontSize: 11, color: UI_TEXT_SECONDARY, marginTop: 2 }}>
                    {formatDate(slot.updatedAt)}
                  </div>

                  {/* Problem summary */}
                  {slot.problemeSummary && (
                    <div style={{ fontSize: 12, color: UI_TEXT_SECONDARY, marginTop: 4, fontStyle: 'italic', lineHeight: 1.3 }}>
                      {slot.problemeSummary}
                    </div>
                  )}

                  {/* Pieces summary */}
                  {slot.piecesSummary && (
                    <div style={{ fontSize: 11, color: UI_TEXT_SECONDARY, marginTop: 2 }}>
                      {slot.piecesSummary}
                    </div>
                  )}

                  {/* Action buttons row */}
                  <div style={{ display: 'flex', gap: 6, marginTop: 8 }}>
                    {!isActive && (
                      <SlotBtn onClick={() => onSwitchSlot(slot.id)}>
                        Ouvrir
                      </SlotBtn>
                    )}
                    <SlotBtn onClick={() => startRename(slot)}>
                      Renommer
                    </SlotBtn>
                    {onExportSlot && (
                      <SlotBtn onClick={() => onExportSlot(slot.id)}>
                        Exporter
                      </SlotBtn>
                    )}
                    <div style={{ flex: 1 }} />
                    {isDeleting ? (
                      <>
                        <SlotBtn
                          destructive
                          onClick={() => { onDeleteSlot(slot.id); setDeletingId(null); }}
                        >
                          Confirmer
                        </SlotBtn>
                        <SlotBtn onClick={() => setDeletingId(null)}>
                          Annuler
                        </SlotBtn>
                      </>
                    ) : (
                      <SlotBtn
                        destructive
                        onClick={() => { setDeletingId(slot.id); setEditingId(null); }}
                      >
                        Supprimer
                      </SlotBtn>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Fermer button */}
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
            minHeight: MIN_BUTTON_SIZE_PX,
          }}
        >
          Fermer
        </button>
      </div>
    </div>
  );
}

// --- Sub-components ---

function SlotBtn({ children, onClick, destructive }: {
  children: React.ReactNode;
  onClick: () => void;
  destructive?: boolean;
}) {
  return (
    <button
      onClick={onClick}
      style={{
        minWidth: 44,
        minHeight: MIN_BUTTON_SIZE_PX,
        padding: '4px 10px',
        borderRadius: 6,
        fontSize: 12,
        fontWeight: 600,
        background: '#fff',
        border: `1.5px solid ${destructive ? UI_DESTRUCTIVE : UI_BORDER}`,
        color: destructive ? UI_DESTRUCTIVE : UI_TEXT_SECONDARY,
        cursor: 'pointer',
        whiteSpace: 'nowrap',
      }}
    >
      {children}
    </button>
  );
}

// --- Icon ---

function FolderPlusIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg" style={{ flexShrink: 0 }}>
      <path
        d="M3 5a2 2 0 012-2h3.172a2 2 0 011.414.586l1.828 1.828A2 2 0 0012.828 6H15a2 2 0 012 2v7a2 2 0 01-2 2H5a2 2 0 01-2-2V5z"
        stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" fill="none"
      />
      <path d="M10 10v4M8 12h4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  );
}
