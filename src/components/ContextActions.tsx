import React, { useState, useEffect } from 'react';
import type { Piece, CouleurPiece } from '../model/types';
import { isBarre, isBoite, isJeton, isFleche, isDroiteNumerique, isTableau, isArbre, isSchema, isDiagrammeBandes } from '../model/types';
import { CHART_MAX_CATEGORIES } from '../model/types';
import type { SchemaGabarit } from '../model/types';
import { computeTreeLayout } from '../engine/arbre-layout';
import { computeSchemaWidth, computeSchemaHeight, getGabaritDefaults } from '../engine/schema-layout';
import { onAddNode, onChangeGabarit, onAddPart } from '../engine/sound';
import { COLORS, UI_BG, UI_BORDER, UI_TEXT_SECONDARY } from '../config/theme';
import { getPieceColor } from '../config/theme';
import { RESPONSE_TEMPLATES } from '../config/messages';
import { onSubdivide } from '../engine/sound';

interface ContextActionsProps {
  piece: Piece;
  canvasRect: DOMRect | null;
  svgElement: SVGSVGElement | null;
  referenceUnitMm: number;
  onStartEdit: (id: string) => void;
  onStartEditLabel: (id: string) => void;
  onStartEditValue: (id: string) => void;
  onStartColumnCalc: (id: string) => void;
  onStartDivisionCalc: (id: string) => void;
  onResizeBar: (id: string, multiplier: number) => void;
  onDuplicateBar: (id: string, count: number) => void;
  onDuplicateBoite: (id: string, count: number) => void;
  boiteHasChildren?: boolean;
  onChangeColor: (id: string, couleur: CouleurPiece) => void;
  onDuplicateJetons: (id: string, count: number) => void;
  freeJetonCount?: number;
  onRepartirJetons?: (groupCount: number) => void;
  onEditPiece: (id: string, changes: Record<string, unknown>) => void;
  onStartEqualizing: (id: string) => void;
  onStartGrouping: (id: string) => void;
  onUngroup: (groupId: string) => void;
  onTableauPreview?: (rows: number | null, cols: number | null) => void;
  onDeletePiece?: (id: string) => void;
  onDismiss?: () => void;
}

export function ContextActions({
  piece,
  canvasRect,
  svgElement,
  referenceUnitMm,
  onStartEdit,
  onStartEditLabel,
  onStartEditValue,
  onStartColumnCalc,
  onStartDivisionCalc,
  onResizeBar,
  onDuplicateBar,
  onDuplicateBoite,
  boiteHasChildren = false,
  onChangeColor,
  onDuplicateJetons,
  freeJetonCount = 0,
  onRepartirJetons,
  onEditPiece,
  onStartEqualizing,
  onStartGrouping,
  onUngroup,
  onTableauPreview,
  onDeletePiece,
  onDismiss: _onDismiss,
}: ContextActionsProps) {
  // I7: Local state for inline division options (replaces prompt())
  // showDivideOptions removed — fraction submenu handles division presets

  // 2.2: Submenu state for bar context actions (reduces cognitive overload)
  const [barSubmenu, setBarSubmenu] = useState<'none' | 'taille' | 'fraction'>('none');

  // Template submenu for reponse pieces
  const [showTemplateOptions, setShowTemplateOptions] = useState(false);

  // Jeton répartir submenu state
  const [showRepartir, setShowRepartir] = useState(false);

  // DroiteNumerique submenu state
  const [droiteSubmenu, setDroiteSubmenu] = useState<'none' | 'min' | 'max' | 'pas' | 'largeur' | 'min-custom' | 'max-custom'>('none');
  const [customValue, setCustomValue] = useState(0);

  // Tableau submenu state + preview
  const [tableauSubmenu, setTableauSubmenu] = useState<'none' | 'lignes' | 'colonnes'>('none');

  // Arbre submenu state
  const [arbreSubmenu, setArbreSubmenu] = useState<'none' | 'gabarit' | 'niveaux'>('none');

  // Schema submenu state
  const [schemaSubmenu, setSchemaSubmenu] = useState<'none' | 'type' | 'taille'>('none');

  // Micro-confirmation for delete (2s timer)
  const [deleteConfirm, setDeleteConfirm] = useState(false);
  useEffect(() => {
    if (!deleteConfirm) return;
    const timer = setTimeout(() => setDeleteConfirm(false), 2000);
    return () => clearTimeout(timer);
  }, [deleteConfirm]);

  // Reset submenus when piece changes
  useEffect(() => {
    setBarSubmenu('none');
    setShowTemplateOptions(false);
    setShowRepartir(false);
    setDroiteSubmenu('none');
    setTableauSubmenu('none');
    setArbreSubmenu('none');
    setSchemaSubmenu('none');
  }, [piece.id]);

  // Convert piece bounding box from SVG mm to screen px
  if (!canvasRect) return null;
  const pieceBounds = getPieceBoundsScreen(piece, svgElement, referenceUnitMm, canvasRect);
  if (!pieceBounds) return null;

  const MAX_ACTIONS_WIDTH = Math.min(380, canvasRect.width - 16);

  // Position: center horizontally on piece, above it (or below if no space).
  // Clamp anchor so the panel (centered via transform) stays within canvas.
  const halfMax = MAX_ACTIONS_WIDTH / 2;
  const anchorX = Math.max(halfMax + 8, Math.min(pieceBounds.centerX, canvasRect.width - halfMax - 8));
  const anchorY = pieceBounds.top >= 80 ? pieceBounds.top - 6 : pieceBounds.bottom + 6;
  const placeAbove = pieceBounds.top >= 80;

  return (
    <div
      data-testid="context-actions"
      style={{
        position: 'fixed',
        left: canvasRect.left + anchorX,
        top: canvasRect.top + anchorY,
        transform: `translate(-50%, ${placeAbove ? '-100%' : '0'})`,
        display: 'flex',
        gap: 10,
        background: '#fff',
        border: '1px solid #D5D0E0',
        borderRadius: 8,
        padding: 4,
        boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
        zIndex: 50,
        flexWrap: 'wrap',
        maxWidth: MAX_ACTIONS_WIDTH,
        // Prevent overflow off canvas edges
        maxHeight: canvasRect.height - 16,
      }}
      onPointerDown={e => e.stopPropagation()}
    >
      {/* Edit (calcul) */}
      {piece.type === 'calcul' && (
        <CtxBtn onClick={() => { onStartEdit(piece.id); }}>
          Éditer
        </CtxBtn>
      )}

      {/* Reponse actions: edit + template submenu */}
      {piece.type === 'reponse' && !showTemplateOptions && (
        <>
          <CtxBtn onClick={() => { onStartEdit(piece.id); }}>
            Éditer
          </CtxBtn>
          <CtxBtn onClick={() => setShowTemplateOptions(true)}>
            Phrase à trous ▸
          </CtxBtn>
        </>
      )}
      {piece.type === 'reponse' && showTemplateOptions && (
        <>
          <CtxBtn onClick={() => setShowTemplateOptions(false)} back>
            ←
          </CtxBtn>
          <CtxBtn onClick={() => {
            onEditPiece(piece.id, { template: null, text: '' });
            setShowTemplateOptions(false);
          }}>
            Texte libre
          </CtxBtn>
          {RESPONSE_TEMPLATES.map(t => (
            <CtxBtn
              key={t.id}
              active={piece.type === 'reponse' && (piece as any).template === t.template}
              onClick={() => {
                onEditPiece(piece.id, { template: t.template, text: '' });
                setShowTemplateOptions(false);
              }}
            >
              {t.label}
            </CtxBtn>
          ))}
        </>
      )}

      {/* Column calc (calcul only) */}
      {piece.type === 'calcul' && (
        <CtxBtn onClick={() => { onStartColumnCalc(piece.id); }}>
          En colonnes
        </CtxBtn>
      )}

      {/* Division posée (calcul only) */}
      {piece.type === 'calcul' && (
        <CtxBtn onClick={() => { onStartDivisionCalc(piece.id); }}>
          Division posée
        </CtxBtn>
      )}

      {/* Boite: Nommer + Valeur + Couleur */}
      {isBoite(piece) && (
        <>
          <CtxBtn onClick={() => onStartEditLabel(piece.id)}>
            Nommer
          </CtxBtn>
          <CtxBtn onClick={() => onStartEditValue(piece.id)}>
            Valeur
          </CtxBtn>
          {!piece.locked && (
            <CtxBtn onClick={() => onDuplicateBoite(piece.id, 1)} disabled={!boiteHasChildren}>
              Copier
            </CtxBtn>
          )}
          <ColorRow pieceId={piece.id} current={piece.couleur} onChange={(id, c) => onEditPiece(id, { couleur: c })} />
        </>
      )}

      {/* Barre — vue unique: Nommer, Taille, Copier, Fraction, Valeur, Grouper, Couleur */}
      {isBarre(piece) && barSubmenu === 'none' && (
        <>
          <CtxBtn onClick={() => onStartEditLabel(piece.id)}>Nommer</CtxBtn>
          {!piece.locked && (
            <CtxBtn onClick={() => setBarSubmenu('taille')}>
              Taille {piece.sizeMultiplier}×
            </CtxBtn>
          )}
          {!piece.locked && (
            <CtxBtn onClick={() => { onDuplicateBar(piece.id, 1); }}>Copier</CtxBtn>
          )}
          {!piece.locked && (
            <CtxBtn onClick={() => setBarSubmenu('fraction')}>
              Fraction {piece.divisions ? `${piece.coloredParts.length}/${piece.divisions}` : ''}
            </CtxBtn>
          )}
          <CtxBtn onClick={() => onStartEditValue(piece.id)}>Valeur</CtxBtn>
          {!piece.groupId && !piece.locked && (
            <CtxBtn testId="ctx-grouper" onClick={() => onStartGrouping(piece.id)}>Grouper</CtxBtn>
          )}
          {piece.groupId && (
            <CtxBtn testId="ctx-degrouper" onClick={() => onUngroup(piece.groupId!)}>Dégrouper</CtxBtn>
          )}
          <ColorRow pieceId={piece.id} current={piece.couleur} onChange={onChangeColor} />
        </>
      )}
      {/* submenu Plus supprimé — tout aplati au L1 */}
      {/* Barre — submenu Taille */}
      {isBarre(piece) && barSubmenu === 'taille' && (
        <>
          <CtxBtn onClick={() => setBarSubmenu('none')} back>←</CtxBtn>
          {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map(n => (
            <CtxBtn key={n} active={piece.sizeMultiplier === n}
              onClick={() => { onResizeBar(piece.id, n); setBarSubmenu('none'); }}>
              {n}×
            </CtxBtn>
          ))}
          <div style={{ width: '100%', height: 1, background: '#E8E5F0', margin: '4px 0' }} />
          {([
            { value: 0.25, label: '¼×' },
            { value: 1/3,  label: '⅓×' },
            { value: 0.5,  label: '½×' },
            { value: 2/3,  label: '⅔×' },
            { value: 0.75, label: '¾×' },
            { value: 1.5,  label: '1½×' },
          ] as const).map(f => (
            <CtxBtn key={f.label} active={Math.abs(piece.sizeMultiplier - f.value) < 0.001}
              onClick={() => { onResizeBar(piece.id, f.value); setBarSubmenu('none'); }}>
              {f.label}
            </CtxBtn>
          ))}
          <div style={{ width: '100%', height: 1, background: '#E8E5F0', margin: '4px 0' }} />
          <CtxBtn onClick={() => { onStartEqualizing(piece.id); setBarSubmenu('none'); }}>
            = une autre barre
          </CtxBtn>
        </>
      )}
      {/* submenu Plus supprimé — Copier et Grouper au premier niveau */}
      {/* Barre — submenu Fraction */}
      {isBarre(piece) && barSubmenu === 'fraction' && (
        <>
          <CtxBtn onClick={() => setBarSubmenu('none')} back>←</CtxBtn>
          {piece.divisions ? (
            <>
              <span style={{ fontSize: 11, color: UI_TEXT_SECONDARY, padding: '4px 8px', display: 'flex', alignItems: 'center' }}>
                Clique sur la barre pour colorer
              </span>
              <CtxBtn onClick={() => { onEditPiece(piece.id, { divisions: null, coloredParts: [], showFraction: false }); setBarSubmenu('none'); }}>
                Effacer
              </CtxBtn>
            </>
          ) : (
            <>
              {/* Row 1 — Unit fractions (divisions only, empty coloredParts) */}
              <span style={{ fontSize: 11, color: UI_TEXT_SECONDARY, padding: '4px 8px', display: 'flex', alignItems: 'center', width: '100%' }}>
                Diviser en
              </span>
              {[2, 3, 4, 5, 6, 8, 10, 12].map(n => (
                <CtxBtn key={n} onClick={() => {
                  onEditPiece(piece.id, { divisions: n, coloredParts: [], showFraction: true });
                  onSubdivide();
                  setBarSubmenu('none');
                }}>
                  {n}
                </CtxBtn>
              ))}
              {/* Row 2 — Common fractions (pre-filled coloredParts) */}
              <span style={{ fontSize: 11, color: UI_TEXT_SECONDARY, padding: '4px 8px', display: 'flex', alignItems: 'center', width: '100%' }}>
                Fractions courantes
              </span>
              <CtxBtn onClick={() => {
                onEditPiece(piece.id, { divisions: 3, coloredParts: [0, 1], showFraction: true });
                onSubdivide(); setBarSubmenu('none');
              }}>
                2/3
              </CtxBtn>
              <CtxBtn onClick={() => {
                onEditPiece(piece.id, { divisions: 4, coloredParts: [0, 1, 2], showFraction: true });
                onSubdivide(); setBarSubmenu('none');
              }}>
                3/4
              </CtxBtn>
              <CtxBtn onClick={() => {
                onEditPiece(piece.id, { divisions: 5, coloredParts: [0, 1], showFraction: true });
                onSubdivide(); setBarSubmenu('none');
              }}>
                2/5
              </CtxBtn>
              <CtxBtn onClick={() => {
                onEditPiece(piece.id, { divisions: 8, coloredParts: [0, 1, 2], showFraction: true });
                onSubdivide(); setBarSubmenu('none');
              }}>
                3/8
              </CtxBtn>
            </>
          )}
        </>
      )}

      {/* Jeton: color + duplicate */}
      {isJeton(piece) && (
        <>
          <ColorRow pieceId={piece.id} current={piece.couleur} onChange={onChangeColor} />
          <CtxBtn onClick={() => onDuplicateJetons(piece.id, 3)}>=3</CtxBtn>
          <CtxBtn onClick={() => onDuplicateJetons(piece.id, 5)}>=5</CtxBtn>
          {freeJetonCount >= 2 && onRepartirJetons && !showRepartir && (
            <CtxBtn onClick={() => setShowRepartir(true)}>Répartir</CtxBtn>
          )}
          {showRepartir && onRepartirJetons && (
            <>
              <CtxBtn onClick={() => setShowRepartir(false)} back>←</CtxBtn>
              {[2, 3, 4, 5, 6].filter(k => k <= freeJetonCount).map(k => (
                <CtxBtn key={k} onClick={() => { onRepartirJetons(k); setShowRepartir(false); }}>
                  {k} groupes
                </CtxBtn>
              ))}
            </>
          )}
        </>
      )}

      {/* Fleche: edit label */}
      {isFleche(piece) && (
        <CtxBtn onClick={() => onStartEdit(piece.id)}>
          Éditer
        </CtxBtn>
      )}

      {/* DroiteNumerique: min/max/step with inline preset buttons (no prompt()) */}
      {isDroiteNumerique(piece) && (
        <>
          {droiteSubmenu === 'none' && (
            <>
              <CtxBtn onClick={() => setDroiteSubmenu('min')}>
                Min: {piece.min}
              </CtxBtn>
              <CtxBtn onClick={() => setDroiteSubmenu('max')}>
                Max: {piece.max}
              </CtxBtn>
              <CtxBtn onClick={() => setDroiteSubmenu('pas')}>
                Pas: {piece.step}
              </CtxBtn>
              <CtxBtn onClick={() => setDroiteSubmenu('largeur')}>
                Largeur
              </CtxBtn>
              {piece.markers.length > 0 && (
                <CtxBtn onClick={() => onEditPiece(piece.id, { markers: [] })}>
                  Effacer marqueurs
                </CtxBtn>
              )}
            </>
          )}
          {droiteSubmenu === 'min' && (
            <>
              <CtxBtn onClick={() => setDroiteSubmenu('none')} back>
                ←
              </CtxBtn>
              {[-15, -10, 0, 5, 10].filter(n => n < piece.max).map(n => (
                <CtxBtn
                  key={n}
                  active={piece.min === n}
                  onClick={() => { onEditPiece(piece.id, { min: n }); setDroiteSubmenu('none'); }}
                >
                  {n}
                </CtxBtn>
              ))}
              <CtxBtn onClick={() => { setCustomValue(piece.min); setDroiteSubmenu('min-custom'); }}>
                Autre…
              </CtxBtn>
            </>
          )}
          {droiteSubmenu === 'min-custom' && (
            <>
              <CtxBtn onClick={() => setDroiteSubmenu('min')} back>
                ←
              </CtxBtn>
              <input
                type="number"
                value={customValue}
                onChange={e => setCustomValue(Number(e.target.value))}
                autoFocus
                style={{ width: 60, minHeight: 44, fontSize: 15, textAlign: 'center', borderRadius: 8, border: '2px solid #D1D5DB', padding: '0 4px' }}
                onKeyDown={e => { if (e.key === 'Enter' && customValue < piece.max) { onEditPiece(piece.id, { min: customValue }); setDroiteSubmenu('none'); } }}
              />
              <CtxBtn
                disabled={customValue >= piece.max}
                onClick={() => { if (customValue < piece.max) { onEditPiece(piece.id, { min: customValue }); setDroiteSubmenu('none'); } }}
              >
                OK
              </CtxBtn>
            </>
          )}
          {droiteSubmenu === 'max' && (
            <>
              <CtxBtn onClick={() => setDroiteSubmenu('none')} back>
                ←
              </CtxBtn>
              {[5, 10, 20, 50, 100].filter(n => n > piece.min).map(n => (
                <CtxBtn
                  key={n}
                  active={piece.max === n}
                  onClick={() => { onEditPiece(piece.id, { max: n }); setDroiteSubmenu('none'); }}
                >
                  {n}
                </CtxBtn>
              ))}
              <CtxBtn onClick={() => { setCustomValue(piece.max); setDroiteSubmenu('max-custom'); }}>
                Autre…
              </CtxBtn>
            </>
          )}
          {droiteSubmenu === 'max-custom' && (
            <>
              <CtxBtn onClick={() => setDroiteSubmenu('max')} back>
                ←
              </CtxBtn>
              <input
                type="number"
                value={customValue}
                onChange={e => setCustomValue(Number(e.target.value))}
                autoFocus
                style={{ width: 60, minHeight: 44, fontSize: 15, textAlign: 'center', borderRadius: 8, border: '2px solid #D1D5DB', padding: '0 4px' }}
                onKeyDown={e => { if (e.key === 'Enter' && customValue > piece.min) { onEditPiece(piece.id, { max: customValue }); setDroiteSubmenu('none'); } }}
              />
              <CtxBtn
                disabled={customValue <= piece.min}
                onClick={() => { if (customValue > piece.min) { onEditPiece(piece.id, { max: customValue }); setDroiteSubmenu('none'); } }}
              >
                OK
              </CtxBtn>
            </>
          )}
          {droiteSubmenu === 'pas' && (
            <>
              <CtxBtn onClick={() => setDroiteSubmenu('none')} back>
                ←
              </CtxBtn>
              {[1, 2, 5, 10].map(n => (
                <CtxBtn
                  key={n}
                  active={piece.step === n}
                  onClick={() => { onEditPiece(piece.id, { step: n }); setDroiteSubmenu('none'); }}
                >
                  {n}
                </CtxBtn>
              ))}
            </>
          )}
          {droiteSubmenu === 'largeur' && (
            <>
              <CtxBtn onClick={() => setDroiteSubmenu('none')} back>
                ←
              </CtxBtn>
              {[100, 150, 200, 300].map(n => (
                <CtxBtn
                  key={n}
                  active={piece.width === n}
                  onClick={() => { onEditPiece(piece.id, { width: n }); setDroiteSubmenu('none'); }}
                >
                  {n}
                </CtxBtn>
              ))}
            </>
          )}
        </>
      )}

      {/* Tableau — premier niveau */}
      {isTableau(piece) && tableauSubmenu === 'none' && (
        <>
          <CtxBtn onClick={() => { setTableauSubmenu('lignes'); }}>
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" style={{ marginRight: 4 }}>
              <line x1="1" y1="3" x2="13" y2="3" /><line x1="1" y1="7" x2="13" y2="7" /><line x1="1" y1="11" x2="13" y2="11" />
            </svg>
            Lignes {piece.rows}
          </CtxBtn>
          <CtxBtn onClick={() => { setTableauSubmenu('colonnes'); }}>
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" style={{ marginRight: 4 }}>
              <line x1="3" y1="1" x2="3" y2="13" /><line x1="7" y1="1" x2="7" y2="13" /><line x1="11" y1="1" x2="11" y2="13" />
            </svg>
            Colonnes {piece.cols}
          </CtxBtn>
          <CtxBtn active={piece.headerRow} onClick={() => onEditPiece(piece.id, { headerRow: !piece.headerRow })}>
            En-tête
          </CtxBtn>
        </>
      )}
      {/* Tableau — sous-menu Lignes (sélection directe, 1 clic = applique) */}
      {isTableau(piece) && tableauSubmenu === 'lignes' && (
        <>
          <CtxBtn onClick={() => { setTableauSubmenu('none'); onTableauPreview?.(null, null); }} back>←</CtxBtn>
          {[2, 3, 4, 5, 6, 7, 8, 9, 10].map(n => (
            <CtxBtn key={n}
              active={piece.rows === n}
              onPointerEnter={() => onTableauPreview?.(n, null)}
              onPointerLeave={() => onTableauPreview?.(null, null)}
              onClick={() => {
                const newCells = n > piece.rows
                  ? [...piece.cells, ...Array.from({ length: n - piece.rows }, () => Array(piece.cols).fill(''))]
                  : piece.cells.slice(0, n);
                onEditPiece(piece.id, { rows: n, cells: newCells });
                setTableauSubmenu('none');
                onTableauPreview?.(null, null);
              }}>
              {n}
            </CtxBtn>
          ))}
        </>
      )}
      {/* Tableau — sous-menu Colonnes (sélection directe, 1 clic = applique) */}
      {isTableau(piece) && tableauSubmenu === 'colonnes' && (
        <>
          <CtxBtn onClick={() => { setTableauSubmenu('none'); onTableauPreview?.(null, null); }} back>←</CtxBtn>
          {[2, 3, 4, 5, 6, 7, 8, 9, 10].map(n => (
            <CtxBtn key={n}
              active={piece.cols === n}
              onPointerEnter={() => onTableauPreview?.(null, n)}
              onPointerLeave={() => onTableauPreview?.(null, null)}
              onClick={() => {
                const newCells = n > piece.cols
                  ? piece.cells.map(r => [...r, ...Array(n - piece.cols).fill('')])
                  : piece.cells.map(r => r.slice(0, n));
                onEditPiece(piece.id, { cols: n, cells: newCells });
                setTableauSubmenu('none');
                onTableauPreview?.(null, null);
              }}>
              {n}
            </CtxBtn>
          ))}
        </>
      )}

      {/* Arbre — premier niveau */}
      {isArbre(piece) && arbreSubmenu === 'none' && (
        <>
          <CtxBtn onClick={() => setArbreSubmenu('gabarit')}>Gabarit</CtxBtn>
          <CtxBtn onClick={() => setArbreSubmenu('niveaux')}>Niveaux {piece.levels.length}</CtxBtn>
          <CtxBtn onClick={() => {
            if (piece.levels.length < 4) {
              const newLevels = [...piece.levels, { name: '', options: ['', ''] }];
              onEditPiece(piece.id, { levels: newLevels });
              onAddNode();
            }
          }} disabled={piece.levels.length >= 4}>+ Niveau</CtxBtn>
        </>
      )}
      {/* Arbre — sous-menu Gabarit (templates) */}
      {isArbre(piece) && arbreSubmenu === 'gabarit' && (
        <>
          <CtxBtn onClick={() => setArbreSubmenu('none')} back>←</CtxBtn>
          {[
            { label: '2×2', levels: [{ name: '', options: ['', ''] }, { name: '', options: ['', ''] }] },
            { label: '2×3', levels: [{ name: '', options: ['', ''] }, { name: '', options: ['', '', ''] }] },
            { label: '3×2', levels: [{ name: '', options: ['', '', ''] }, { name: '', options: ['', ''] }] },
            { label: '3×3', levels: [{ name: '', options: ['', '', ''] }, { name: '', options: ['', '', ''] }] },
            { label: '4×2', levels: [{ name: '', options: ['', '', '', ''] }, { name: '', options: ['', ''] }] },
          ].map(t => (
            <CtxBtn key={t.label} onClick={() => {
              onEditPiece(piece.id, { levels: t.levels });
              setArbreSubmenu('none');
              onChangeGabarit();
            }}>{t.label}</CtxBtn>
          ))}
        </>
      )}
      {/* Arbre — sous-menu Niveaux (ajuster options par niveau) */}
      {isArbre(piece) && arbreSubmenu === 'niveaux' && (
        <>
          <CtxBtn onClick={() => setArbreSubmenu('none')} back>←</CtxBtn>
          {piece.levels.map((level, li) => (
            <React.Fragment key={li}>
              <CtxBtn onClick={() => {
                if (level.options.length > 1) {
                  const newLevels = piece.levels.map((l, i) =>
                    i === li ? { ...l, options: l.options.slice(0, -1) } : l
                  );
                  onEditPiece(piece.id, { levels: newLevels });
                }
              }} disabled={level.options.length <= 1}>−</CtxBtn>
              <CtxBtn onClick={() => {}} disabled>{level.name || `Choix ${li + 1}`} ×{level.options.length}</CtxBtn>
              <CtxBtn onClick={() => {
                if (level.options.length < 6) {
                  const newLevels = piece.levels.map((l, i) =>
                    i === li ? { ...l, options: [...l.options, ''] } : l
                  );
                  onEditPiece(piece.id, { levels: newLevels });
                  onAddNode();
                }
              }} disabled={level.options.length >= 6}>+</CtxBtn>
            </React.Fragment>
          ))}
        </>
      )}

      {/* Schema — premier niveau */}
      {isSchema(piece) && schemaSubmenu === 'none' && (
        <>
          <CtxBtn onClick={() => setSchemaSubmenu('type')}>Type</CtxBtn>
          {/* Discrete size buttons — direct in L1 to reduce clicks (R12) */}
          {/* For comparaison: resize first bar only, preserve ratio. Others: uniform. */}
          {[0.5, 1, 2, 3].map(m => (
            <CtxBtn key={m}
              active={piece.bars[0]?.sizeMultiplier === m}
              onClick={() => {
                let newBars;
                if (piece.gabarit === 'comparaison' && piece.bars.length >= 2) {
                  // Preserve ratio between bars
                  const oldFirst = piece.bars[0].sizeMultiplier || 1;
                  const ratio = m / oldFirst;
                  newBars = piece.bars.map(b => ({ ...b, sizeMultiplier: Math.max(0.25, b.sizeMultiplier * ratio) }));
                } else {
                  newBars = piece.bars.map(b => ({ ...b, sizeMultiplier: m }));
                }
                onEditPiece(piece.id, { bars: newBars, referenceWidth: m * referenceUnitMm });
              }}>×{m}</CtxBtn>
          ))}
          {/* Add/remove parts (for parties-tout, transformation) */}
          {(piece.gabarit === 'parties-tout' || piece.gabarit === 'transformation' || piece.gabarit === 'libre') && (
            <CtxBtn onClick={() => {
              const bar = piece.bars[0];
              if (bar && bar.parts.length < 6) {
                const partColors: ('bleu' | 'rouge' | 'vert' | 'jaune')[] = ['bleu', 'rouge', 'vert', 'jaune'];
                const newColor = partColors[bar.parts.length % partColors.length];
                const newParts = [...bar.parts, { label: '', value: null, couleur: newColor }];
                const newBars = [{ ...bar, parts: newParts }, ...piece.bars.slice(1)];
                onEditPiece(piece.id, { bars: newBars });
                onAddPart();
              }
            }} disabled={piece.bars[0]?.parts.length >= 6}>+ Partie</CtxBtn>
          )}
          {/* Add bar (for comparaison, groupes-egaux) */}
          {(piece.gabarit === 'comparaison' || piece.gabarit === 'groupes-egaux') && piece.bars.length < 8 && (
            <CtxBtn onClick={() => {
              const refBar = piece.bars[0] || { label: '', value: null, sizeMultiplier: 1, couleur: 'bleu', parts: [] };
              const newBar = { ...refBar, label: '', couleur: piece.gabarit === 'comparaison' ? (['bleu', 'rouge', 'vert', 'jaune'][piece.bars.length % 4] as any) : refBar.couleur };
              onEditPiece(piece.id, { bars: [...piece.bars, newBar] });
              onAddPart();
            }}>+ Barre</CtxBtn>
          )}
        </>
      )}
      {/* Schema — sous-menu Type (R12: illustration + verbe d'action) */}
      {isSchema(piece) && schemaSubmenu === 'type' && (
        <>
          <CtxBtn onClick={() => setSchemaSubmenu('none')} back>←</CtxBtn>
          {([
            { g: 'parties-tout' as SchemaGabarit, label: 'Séparer en parties' },
            { g: 'comparaison' as SchemaGabarit, label: 'Comparer deux quantités' },
            { g: 'groupes-egaux' as SchemaGabarit, label: 'Faire des groupes égaux' },
            { g: 'transformation' as SchemaGabarit, label: 'Avant → Après' },
            { g: 'libre' as SchemaGabarit, label: 'Libre' },
          ]).map(({ g, label }) => (
            <CtxBtn key={g}
              active={piece.gabarit === g}
              onClick={() => {
                const defaults = getGabaritDefaults(g, referenceUnitMm);
                onEditPiece(piece.id, { ...defaults });
                setSchemaSubmenu('none');
                onChangeGabarit();
              }}>{label}</CtxBtn>
          ))}
        </>
      )}

      {/* DiagrammeBandes — actions contextuelles */}
      {isDiagrammeBandes(piece) && (
        <>
          <CtxBtn onClick={() => onStartEdit(piece.id)}>Titre</CtxBtn>
          {piece.categories.map((cat, i) => (
            <CtxBtn key={`cat-${i}`} onClick={() => {
              const newLabel = prompt('Catégorie :', cat.label);
              if (newLabel === null) return;
              const newValue = prompt('Valeur :', String(cat.value));
              if (newValue === null) return;
              const parsed = parseFloat(newValue);
              if (isNaN(parsed)) return;
              const newCats = [...piece.categories];
              newCats[i] = { ...newCats[i], label: newLabel, value: parsed };
              onEditPiece(piece.id, { categories: newCats });
            }}>{cat.label}: {cat.value}</CtxBtn>
          ))}
          {piece.categories.length < CHART_MAX_CATEGORIES && (
            <CtxBtn onClick={() => {
              const partColors = ['bleu', 'rouge', 'vert', 'jaune'] as const;
              const newCat = { label: '', value: 0, couleur: partColors[piece.categories.length % 4] };
              onEditPiece(piece.id, { categories: [...piece.categories, newCat] });
            }}>+ Bande</CtxBtn>
          )}
          {piece.categories.length > 1 && (
            <CtxBtn onClick={() => {
              onEditPiece(piece.id, { categories: piece.categories.slice(0, -1) });
            }}>− Bande</CtxBtn>
          )}
        </>
      )}

      {/* DiagrammeLigne — actions contextuelles */}
      {piece.type === 'diagrammeLigne' && (
        <>
          <CtxBtn onClick={() => onStartEdit(piece.id)}>Titre</CtxBtn>
          {(piece as any).points.map((pt: any, i: number) => (
            <CtxBtn key={`pt-${i}`} onClick={() => {
              const newLabel = prompt('Étiquette :', pt.label);
              if (newLabel === null) return;
              const newValue = prompt('Valeur :', String(pt.value));
              if (newValue === null) return;
              const parsed = parseFloat(newValue);
              if (isNaN(parsed)) return;
              const newPts = [...(piece as any).points];
              newPts[i] = { ...newPts[i], label: newLabel, value: parsed };
              onEditPiece(piece.id, { points: newPts });
            }}>{pt.label}: {pt.value}</CtxBtn>
          ))}
          {(piece as any).points.length < CHART_MAX_CATEGORIES && (
            <CtxBtn onClick={() => {
              const newPt = { label: '', value: 0 };
              onEditPiece(piece.id, { points: [...(piece as any).points, newPt] });
            }}>+ Point</CtxBtn>
          )}
          {(piece as any).points.length > 1 && (
            <CtxBtn onClick={() => {
              onEditPiece(piece.id, { points: (piece as any).points.slice(0, -1) });
            }}>− Point</CtxBtn>
          )}
        </>
      )}

      {/* Inconnue — éditer texte */}
      {piece.type === 'inconnue' && (
        <CtxBtn onClick={() => onStartEdit(piece.id)}>Texte</CtxBtn>
      )}

      {/* Delete — micro-confirmation "Sûr?" (2s timer) */}
      {onDeletePiece && !piece.locked && (
        <CtxBtn
          testId="ctx-delete"
          destructive
          onClick={() => {
            if (deleteConfirm) {
              onDeletePiece(piece.id);
            } else {
              setDeleteConfirm(true);
            }
          }}
        >
          {deleteConfirm ? 'Sûr?' : 'Supprimer'}
        </CtxBtn>
      )}
    </div>
  );
}

function CtxBtn({ children, onClick, active, destructive, back, disabled, testId, onPointerEnter, onPointerLeave }: {
  children: React.ReactNode;
  onClick: () => void;
  active?: boolean;
  destructive?: boolean;
  back?: boolean;
  disabled?: boolean;
  testId?: string;
  onPointerEnter?: () => void;
  onPointerLeave?: () => void;
}) {
  return (
    <button
      onClick={disabled ? undefined : onClick}
      onPointerEnter={onPointerEnter}
      onPointerLeave={onPointerLeave}
      disabled={disabled}
      data-testid={testId}
      style={{
        padding: back ? '10px 12px' : '10px 14px',
        fontSize: back ? 14 : 13,
        borderRadius: 6,
        background: disabled ? '#F0F0F0' : back ? '#F3F4F6' : destructive ? '#FEE2E2' : active ? '#EBF0F9' : UI_BG,
        border: `1px solid ${disabled ? '#E0E0E0' : back ? '#D5D0E0' : destructive ? COLORS.destructive : active ? COLORS.primary : UI_BORDER}`,
        color: disabled ? '#C0C0C0' : back ? '#6B7280' : destructive ? COLORS.destructive : active ? COLORS.primary : UI_TEXT_SECONDARY,
        cursor: disabled ? 'default' : 'pointer',
        whiteSpace: 'nowrap',
        minHeight: 44,
        minWidth: 44,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        opacity: disabled ? 0.5 : 1,
      }}
    >
      {children}
    </button>
  );
}

/** Rangée de pastilles couleur — convention universelle, toujours sur sa propre ligne */
function ColorRow({ pieceId, current, onChange }: {
  pieceId: string;
  current: CouleurPiece;
  onChange: (id: string, c: CouleurPiece) => void;
}) {
  return (
    <div style={{ display: 'flex', gap: 6, width: '100%', paddingTop: 2 }}>
      {(['bleu', 'rouge', 'vert', 'jaune'] as CouleurPiece[]).map(c => (
        <button key={c} onClick={() => onChange(pieceId, c)}
          aria-label={`Couleur ${c}`}
          style={{
            minWidth: 44, minHeight: 44, borderRadius: '50%',
            background: getPieceColor(c),
            border: `3px solid ${current === c ? '#1E1A2E' : 'transparent'}`,
            cursor: 'pointer', opacity: current === c ? 1 : 0.5,
          }}
        />
      ))}
    </div>
  );
}

// Convert piece bounding box from SVG mm to screen px, relative to canvas container
function getPieceBoundsScreen(
  piece: Piece,
  svg: SVGSVGElement | null,
  refUnit: number,
  canvasRect: DOMRect
): { top: number; bottom: number; centerX: number } | null {
  if (!svg) return null;
  const ctm = svg.getScreenCTM();
  if (!ctm) return null;

  // Get piece bounds in mm
  let x = piece.x;
  let y = piece.y;
  let w = 20;
  let h = 15;

  if (isBarre(piece)) {
    w = piece.sizeMultiplier * refUnit;
    h = 15;
  } else if (isBoite(piece)) {
    w = piece.width;
    h = piece.height;
  } else if (piece.type === 'calcul') {
    w = Math.max(80, (piece as any).expression?.length * 5 + 10 || 80);
    h = 14;
  } else if (piece.type === 'reponse') {
    const rp = piece as any;
    if (rp.template) {
      const parts = (rp.template as string).split('___');
      const blanks = rp.text ? (rp.text as string).split('|') : [];
      let tpl = '';
      for (let i = 0; i < parts.length; i++) {
        tpl += parts[i];
        if (i < parts.length - 1) tpl += blanks[i] || '____';
      }
      w = Math.max(120, tpl.length * 3.2 + 20);
    } else {
      w = Math.max(100, (rp.text?.length ?? 0) * 4 + 20);
    }
    h = 22;
  } else if (piece.type === 'jeton') {
    x -= 4; y -= 4; w = 8; h = 8;
  } else if (piece.type === 'inconnue') {
    x -= 6; y -= 6; w = 12; h = 12;
  } else if (piece.type === 'diagrammeBandes' || piece.type === 'diagrammeLigne') {
    w = (piece as any).width || 120;
    h = (piece as any).height || 90;
  } else if (isDroiteNumerique(piece)) {
    w = piece.width;
    h = 20;
    y -= 10; // selection highlight extends above the line
  } else if (isTableau(piece)) {
    w = piece.cols * 12;
    h = piece.rows * 10;
  } else if (isArbre(piece)) {
    const tl = computeTreeLayout(piece.levels);
    w = tl.width;
    h = tl.height;
  } else if (isSchema(piece)) {
    w = computeSchemaWidth(piece, refUnit);
    h = computeSchemaHeight(piece);
  } else if (piece.type === 'fleche') {
    // For arrows, find the rendered SVG element and use its bounding box
    const el = svg.querySelector(`[data-piece-id="${piece.id}"]`);
    if (el) {
      const bbox = (el as SVGGraphicsElement).getBBox();
      x = bbox.x; y = bbox.y; w = bbox.width; h = bbox.height;
    }
  }

  const topLeft = new DOMPoint(x, y).matrixTransform(ctm);
  const bottomRight = new DOMPoint(x + w, y + h).matrixTransform(ctm);

  return {
    top: topLeft.y - canvasRect.top,
    bottom: bottomRight.y - canvasRect.top,
    centerX: (topLeft.x + bottomRight.x) / 2 - canvasRect.left,
  };
}
