import { useState, useEffect, useCallback, useRef } from 'react';
import { appReducer, createInitialAppState } from './model/state';
import type { Action } from './model/state';
import { loadSettings, saveSettings, clearAllStorage, exportModelisation, importModelisation, loadEmergencySave } from './model/persistence';
import { parseShareParam, exportModelisationAsPng } from './engine/share';
import { exportModelisationAsPdf } from './engine/pdf-export';
import { useAutoSave } from './hooks/useAutoSave';
import { useSlotManager } from './hooks/useSlotManager';
import { migrateIfNeeded } from './model/slot-persistence';
import { loadSlotData } from './model/slot-persistence';
import type { UndoManager, ToolType, Highlight, Settings } from './model/types';
import { DEFAULT_SETTINGS } from './model/types';
import { canUndo, canRedo, undo, redo } from './model/undo';
import { useTutorial } from './hooks/useTutorial';
import { useSessionTimer } from './hooks/useSessionTimer';
import { useTTS } from './hooks/useTTS';
import { Toolbar } from './components/Toolbar';
import { ActionBar } from './components/ActionBar';
import { ProblemZone } from './components/ProblemZone';
import { Canvas } from './components/Canvas';
import { StatusBar } from './components/StatusBar';
import { ProblemSelector } from './components/ProblemSelector';
import { AdultGuide } from './components/AdultGuide';
import { SharePanel } from './components/SharePanel';
import { SettingsPanel } from './components/SettingsPanel';
import { SlotManager } from './components/SlotManager';
import { ConfirmDialog } from './components/ConfirmDialog';
import type { ConfirmDialogProps } from './components/ConfirmDialog';
import { TOOL_MESSAGES, AMORCAGE_WITH_PROBLEM, AMORCAGE_POST_HIGHLIGHT, AMORCAGE_NO_PROBLEM, RELANCE_QUESTIONS, STATUS_DELETE_MODE, STATUS_DELETE_CONFIRM } from './config/messages';
import { onDelete, onUndoSound, setSoundMode, setGainMultiplier } from './engine/sound';
import type { ProblemPreset } from './config/problems';

export default function App() {
  const [undoManager, setUndoManager] = useState<UndoManager>(
    () => createInitialAppState().undoManager
  );
  const [activeTool, setActiveTool] = useState<ToolType>(null);
  const [selectedPieceId, setSelectedPieceId] = useState<string | null>(null);
  const [editingPieceId, setEditingPieceId] = useState<string | null>(null);
  const [jetonQuantity, setJetonQuantity] = useState(1);
  const [problemExpanded, setProblemExpanded] = useState(true);
  const [showProblemSelector, setShowProblemSelector] = useState(false);
  const [problemZoneActive, setProblemZoneActive] = useState(false);
  const [showAdultGuide, setShowAdultGuide] = useState(false);
  const [showSharePanel, setShowSharePanel] = useState(false);
  const [showRelance, setShowRelance] = useState(false);
  const [relanceIndex, setRelanceIndex] = useState(0);
  const [arrowFromId, setArrowFromId] = useState<string | null>(null);
  const [deleteMode, setDeleteMode] = useState(false);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  const [equalizingFromId, setEqualizingFromId] = useState<string | null>(null);
  const [groupingBarId, setGroupingBarId] = useState<string | null>(null);
  const [settings, setSettings] = useState<Settings>(DEFAULT_SETTINGS);
  const [showSettings, setShowSettings] = useState(false);
  const [confirmDialog, setConfirmDialog] = useState<Omit<ConfirmDialogProps, 'onCancel'> | null>(null);
  const [showSlotManager, setShowSlotManager] = useState(false);
  const [isSharedProblem, setIsSharedProblem] = useState(false);
  const relanceTimer = useRef<ReturnType<typeof setTimeout>>(undefined);
  const inactivityTimer = useRef<ReturnType<typeof setTimeout>>(undefined);
  const [showLabelNudge, setShowLabelNudge] = useState(false);
  const labelNudgeShownRef = useRef(false);
  const settingsLoadedRef = useRef(false);
  const [appReady, setAppReady] = useState(false);
  const [showInactivityRelance, setShowInactivityRelance] = useState(false);
  const [inactivityRelanceIndex, setInactivityRelanceIndex] = useState(0);

  const current = undoManager.current;
  const { pieces, probleme, problemeHighlights } = current;

  // Tutorial
  const tutorial = useTutorial(current);

  // R6: Session timer
  const sessionTimer = useSessionTimer(settings.sessionTimerEnabled, settings.sessionTimerAlertMinutes);

  // TTS (text-to-speech)
  const tts = useTTS();

  // When tutorial changes problem, update state
  useEffect(() => {
    if (tutorial.isActive && tutorial.currentProblem) {
      if (current.probleme !== tutorial.currentProblem) {
        dispatch({ type: 'SET_PROBLEM_AND_CLEAR', text: tutorial.currentProblem, readOnly: true });
        setProblemZoneActive(true);
      }
    }
  }, [tutorial.isActive, tutorial.currentProblem, tutorial.tutorialProblemIndex]);

  // Derived state
  const hasProblem = probleme.length > 0;
  const hasHighlights = problemeHighlights.length > 0;
  const hasPieces = pieces.length > 0;
  const isAmorcage = hasProblem && !hasPieces && !hasHighlights;
  const isPostHighlight = hasProblem && !hasPieces && hasHighlights;

  // Activity counter — incremented on every dispatch to reset inactivity timer (I2 fix)
  const [activityTick, setActivityTick] = useState(0);

  // Dispatch
  const dispatch = useCallback((action: Action) => {
    setUndoManager(prev => {
      const fakeAppState = {
        undoManager: prev,
        activeTool: null,
        selectedPieceId: null,
        editingPieceId: null,
        problemZoneExpanded: true,
      };
      const result = appReducer(fakeAppState, action);
      if (action.type === 'PLACE_PIECE' && action.piece.type === 'reponse') {
        setProblemExpanded(true);
      }
      return result.undoManager;
    });
    setActivityTick(t => t + 1);
  }, []);

  // Slot manager
  const slotManager = useSlotManager({ undoManager, dispatch });

  const handleUndo = useCallback(() => {
    setUndoManager(prev => {
      if (!canUndo(prev)) return prev;
      onUndoSound();
      return undo(prev);
    });
    setSelectedPieceId(null);
    setEditingPieceId(null);
    setDeleteConfirmId(null);
  }, []);

  const handleRedo = useCallback(() => {
    setUndoManager(prev => canRedo(prev) ? redo(prev) : prev);
    setSelectedPieceId(null);
    setEditingPieceId(null);
    setDeleteConfirmId(null);
  }, []);

  // Restore from IndexedDB on mount (slot-based)
  useEffect(() => {
    (async () => {
      const reg = await migrateIfNeeded();
      slotManager.initRegistry(reg);
      if (reg.activeSlotId) {
        const data = await loadSlotData(reg.activeSlotId);
        // I6: Check emergency save and use whichever has more pieces
        const emergency = loadEmergencySave();
        let finalData = data;
        if (emergency && (!data || emergency.current.pieces.length > data.current.pieces.length)) {
          finalData = emergency;
        }
        if (finalData) {
          setUndoManager(finalData);
          setProblemZoneActive(finalData.current.probleme.length > 0);
        } else {
          setShowAdultGuide(true);
        }
      } else {
        setShowAdultGuide(true);
      }
      // URL sharing: ?probleme=text (simple) or ?s=<lz-compressed> (rich with pieces)
      const shared = parseShareParam(window.location.search);
      if (shared) {
        dispatch({ type: 'SET_PROBLEM_AND_CLEAR', text: shared.text, readOnly: true });
        if (shared.pieces.length > 0) {
          dispatch({ type: 'PLACE_PIECES', pieces: shared.pieces });
        }
        setProblemZoneActive(true);
        setIsSharedProblem(true);
        window.history.replaceState({}, '', window.location.pathname);
      }
    })().then(() => setAppReady(true));
    loadSettings().then(s => { setSettings(s); settingsLoadedRef.current = true; });
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Auto-save settings on change + sync sound/font/spacing (skip initial mount)
  useEffect(() => {
    if (settingsLoadedRef.current) saveSettings(settings);
    setSoundMode(settings.soundMode);
    setGainMultiplier(settings.soundGain);
    // Apply font family + letter spacing + size compensation
    const fontMap: Record<string, { family: string; sizeAdjust: string }> = {
      system: { family: "-apple-system, BlinkMacSystemFont, 'Segoe UI', system-ui, sans-serif", sizeAdjust: '100%' },
      atkinson: { family: "'Atkinson Hyperlegible', -apple-system, sans-serif", sizeAdjust: '110%' },
      opendyslexic: { family: "'OpenDyslexic', -apple-system, sans-serif", sizeAdjust: '105%' },
    };
    const font = fontMap[settings.fontFamily] || fontMap.system;
    document.documentElement.style.setProperty('--font-body', font.family);
    document.documentElement.style.setProperty('--font-size-adjust', font.sizeAdjust);
    document.documentElement.style.setProperty('--letter-spacing', settings.letterSpacing ? `${settings.letterSpacing}em` : 'normal');
  }, [settings]);

  const handleCloseAdultGuide = useCallback(() => {
    setShowAdultGuide(false);
    tutorial.startTutorial();
  }, [tutorial]);

  // Auto-save (slot-aware)
  useAutoSave(undoManager, slotManager.activeSlotId, slotManager.touchActiveSlot);

  // beforeunload
  useEffect(() => {
    const handler = (e: BeforeUnloadEvent) => {
      if (pieces.length > 0) e.preventDefault();
    };
    window.addEventListener('beforeunload', handler);
    return () => window.removeEventListener('beforeunload', handler);
  }, [pieces.length]);

  // Keyboard (gated by settings.keyboardShortcutsEnabled for undo/redo)
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'z' && settings.keyboardShortcutsEnabled) {
        e.preventDefault();
        if (e.shiftKey) handleRedo();
        else handleUndo();
      }
      if (e.key === 'Escape') {
        if (showProblemSelector) {
          setShowProblemSelector(false);
        } else if (editingPieceId) {
          setEditingPieceId(null);
        } else if (arrowFromId) {
          setArrowFromId(null);
        } else if (equalizingFromId) {
          setEqualizingFromId(null);
        } else if (groupingBarId) {
          setGroupingBarId(null);
        } else if (deleteMode) {
          setDeleteMode(false);
          setDeleteConfirmId(null);
        } else if (selectedPieceId) {
          setSelectedPieceId(null);
          if (activeTool) setActiveTool(null);
        } else if (activeTool) {
          setActiveTool(null);
        }
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [selectedPieceId, activeTool, editingPieceId, arrowFromId, equalizingFromId, groupingBarId, deleteMode, handleUndo, handleRedo, settings.keyboardShortcutsEnabled]);

  // Relance timer — sequential questions (P0-2, P0-3)
  useEffect(() => {
    if (relanceTimer.current) clearTimeout(relanceTimer.current);
    setShowRelance(false);
    setRelanceIndex(0);
    if (settings.relanceDelayMs > 0 && hasProblem && !hasPieces) {
      relanceTimer.current = setTimeout(() => setShowRelance(true), settings.relanceDelayMs);
    }
    return () => { if (relanceTimer.current) clearTimeout(relanceTimer.current); };
  }, [hasProblem, hasPieces, settings.relanceDelayMs]);

  // Relance cascade — advance to next question after each delay
  useEffect(() => {
    const active = showRelance || showInactivityRelance;
    const idx = showRelance ? relanceIndex : inactivityRelanceIndex;
    if (!active || idx >= 2) return;
    const timer = setTimeout(() => {
      if (showRelance) setRelanceIndex(prev => prev + 1);
      else setInactivityRelanceIndex(prev => prev + 1);
    }, settings.relanceDelayMs);
    return () => clearTimeout(timer);
  }, [showRelance, relanceIndex, showInactivityRelance, inactivityRelanceIndex, settings.relanceDelayMs]);

  // Relance métacognitive — après que l'enfant écrit sa réponse
  const [showCheckRelance, setShowCheckRelance] = useState(false);
  const hasReponseText = pieces.some(p => p.type === 'reponse' && 'text' in p && (p as any).text?.length > 0);
  useEffect(() => {
    if (!hasReponseText || !hasProblem || tutorial.isActive) {
      setShowCheckRelance(false);
      return;
    }
    setShowCheckRelance(false); // reset on any activity change
    const timer = setTimeout(() => setShowCheckRelance(true), 5000);
    return () => clearTimeout(timer);
  }, [hasReponseText, hasProblem, tutorial.isActive, activityTick]);

  // Auto-dismiss relance métacognitive after 30s
  useEffect(() => {
    if (!showCheckRelance) return;
    const t = setTimeout(() => setShowCheckRelance(false), 30000);
    return () => clearTimeout(t);
  }, [showCheckRelance]);

  // Relance d'inactivité — quand des pièces existent mais aucune nouvelle action
  useEffect(() => {
    if (inactivityTimer.current) clearTimeout(inactivityTimer.current);
    setShowInactivityRelance(false);
    setInactivityRelanceIndex(0);
    if (settings.relanceDelayMs > 0 && hasProblem && hasPieces && !tutorial.isActive) {
      inactivityTimer.current = setTimeout(() => setShowInactivityRelance(true), settings.relanceDelayMs);
    }
    return () => { if (inactivityTimer.current) clearTimeout(inactivityTimer.current); };
  }, [hasProblem, hasPieces, activityTick, settings.relanceDelayMs, tutorial.isActive]);

  // Nudge: encourage labeling bars after 5s if unlabeled bars exist
  const unlabeledBars = pieces.filter(p => p.type === 'barre' && !('label' in p && (p as any).label));
  useEffect(() => {
    if (labelNudgeShownRef.current || unlabeledBars.length === 0 || tutorial.isActive) {
      setShowLabelNudge(false);
      return;
    }
    const timer = setTimeout(() => {
      setShowLabelNudge(true);
      labelNudgeShownRef.current = true;
    }, 5000);
    return () => clearTimeout(timer);
  }, [unlabeledBars.length, tutorial.isActive]);

  // When tutorial is done, show problem selector
  useEffect(() => {
    if (tutorial.isDone) {
      dispatch({ type: 'SET_PROBLEM_AND_CLEAR', text: '', readOnly: false });
      setShowProblemSelector(true);
    }
  }, [tutorial.isDone, dispatch]);

  // Tool selection — exit delete mode when selecting a tool
  const handleSelectTool = useCallback((tool: ToolType) => {
    if (tool) {
      setDeleteMode(false);
      setDeleteConfirmId(null);
    }
    setArrowFromId(null);
    setEqualizingFromId(null);
    setGroupingBarId(null);
    setActiveTool(tool);
    setSelectedPieceId(null);
    setEditingPieceId(null);
  }, []);

  // Delete mode toggle
  const handleToggleDeleteMode = useCallback(() => {
    setDeleteMode(prev => {
      const next = !prev;
      if (next) {
        setActiveTool(null);
        setSelectedPieceId(null);
        setEditingPieceId(null);
      }
      setDeleteConfirmId(null);
      return next;
    });
  }, []);

  // Delete click handler — called from Canvas when in delete mode
  const handleDeleteClick = useCallback((pieceId: string) => {
    if (deleteConfirmId === pieceId) {
      // Second click — confirm delete
      dispatch({ type: 'DELETE_PIECE', id: pieceId });
      onDelete(); // neutral sound
      setDeleteConfirmId(null);
      setSelectedPieceId(null);
    } else {
      // First click — request confirmation
      setDeleteConfirmId(pieceId);
      setSelectedPieceId(pieceId);
    }
  }, [deleteConfirmId, dispatch]);

  // Recommencer
  const handleRecommencer = useCallback(() => {
    if (pieces.length === 0 && problemeHighlights.length === 0) return;
    setConfirmDialog({
      title: 'Effacer les pièces?',
      subtitle: 'Tu peux toujours revenir avec Annuler.',
      confirmLabel: 'Oui, recommencer',
      cancelLabel: 'Non, je continue',
      onConfirm: () => {
        dispatch({ type: 'CLEAR_PIECES' });
        setSelectedPieceId(null);
        setEditingPieceId(null);
        setActiveTool(null);
        setDeleteMode(false);
        setDeleteConfirmId(null);
        setConfirmDialog(null);
      },
    });
  }, [pieces.length, problemeHighlights.length, dispatch]);

  // Reset
  const handleReset = useCallback(() => {
    setConfirmDialog({
      title: 'Tout effacer?',
      subtitle: 'Le tutoriel va recommencer.',
      confirmLabel: 'Oui, tout effacer',
      cancelLabel: 'Non, je continue',
      onConfirm: async () => {
        setConfirmDialog(null);
        await clearAllStorage();
        window.location.reload();
      },
    });
  }, []);

  // Export/Import .resomolo files
  const handleExport = useCallback(() => {
    exportModelisation(current);
  }, [current]);

  const handleExportPdf = useCallback(() => {
    const svg = document.querySelector('[data-testid="canvas-svg"]') as SVGSVGElement | null;
    if (svg) exportModelisationAsPdf(probleme, svg);
  }, [probleme]);

  const handleImport = useCallback(async (file: File) => {
    const state = await importModelisation(file);
    if (state) {
      dispatch({ type: 'RESTORE', undoManager: { past: [], current: state, future: [] } });
      setShowSettings(false);
    }
  }, [dispatch]);

  // Select a problem
  const handleSelectProblem = useCallback((preset: ProblemPreset) => {
    tutorial.skipTutorial();
    dispatch({ type: 'SET_PROBLEM_AND_CLEAR', text: preset.text, readOnly: preset.text.length > 0 });
    setShowProblemSelector(false);
    setProblemZoneActive(true);
    setSelectedPieceId(null);
    setEditingPieceId(null);
    setActiveTool(null);
    setDeleteMode(false);
    // Auto-name slot from problem (if slot still has default name)
    if (slotManager.activeSlotId && preset.text) {
      const active = slotManager.registry.slots.find(s => s.id === slotManager.activeSlotId);
      if (active && /^Modélisation \d+$/.test(active.name)) {
        const name = preset.title || (preset.text.length > 40 ? preset.text.slice(0, 40) + '…' : preset.text);
        slotManager.renameSlot(active.id, name);
      }
    }
  }, [dispatch, tutorial, slotManager]);

  // Highlight handlers
  const handleHighlightAdd = useCallback((h: Highlight) => {
    dispatch({ type: 'HIGHLIGHT_ADD', highlight: h });
  }, [dispatch]);

  const handleHighlightRemove = useCallback((start: number, end: number) => {
    dispatch({ type: 'HIGHLIGHT_REMOVE', start, end });
  }, [dispatch]);

  const handleTextChange = useCallback((text: string) => {
    dispatch({ type: 'SET_PROBLEM', text, readOnly: false });
  }, [dispatch]);

  // Status bar message
  let statusMessage: string;
  let statusVariant: 'default' | 'relance' = 'default';

  if (deleteMode) {
    if (deleteConfirmId) {
      const confirmPiece = pieces.find(p => p.id === deleteConfirmId);
      const confirmLabel = confirmPiece
        ? ('label' in confirmPiece && confirmPiece.label) || confirmPiece.type
        : 'cet élément';
      statusMessage = STATUS_DELETE_CONFIRM(confirmLabel);
    } else {
      statusMessage = STATUS_DELETE_MODE;
    }
    if (deleteConfirmId) statusVariant = 'relance'; // use orange for confirm
  } else if (equalizingFromId) {
    statusMessage = 'Clique sur la barre à redimensionner';
  } else if (groupingBarId) {
    statusMessage = 'Clique sur les barres à ajouter au groupe. Escape pour terminer.';
  } else if (tutorial.isActive) {
    statusMessage = tutorial.message;
  } else if (editingPieceId) {
    statusMessage = 'Entrée pour valider, Escape pour annuler';
  } else if (showRelance) {
    statusMessage = RELANCE_QUESTIONS[relanceIndex];
    statusVariant = 'relance';
  } else if (activeTool === 'fleche' && arrowFromId) {
    statusMessage = 'Maintenant, clique sur la pièce d\'arrivée';
  } else if (activeTool) {
    statusMessage = TOOL_MESSAGES[activeTool];
  } else if (isAmorcage) {
    statusMessage = AMORCAGE_WITH_PROBLEM;
  } else if (isPostHighlight) {
    statusMessage = AMORCAGE_POST_HIGHLIGHT;
  } else if (!hasPieces) {
    statusMessage = AMORCAGE_NO_PROBLEM;
  } else if (showCheckRelance) {
    statusMessage = 'Relis le problème. Est-ce que ta réponse répond à la question?';
    statusVariant = 'relance';
  } else if (showInactivityRelance) {
    statusMessage = RELANCE_QUESTIONS[inactivityRelanceIndex];
    statusVariant = 'relance';
  } else if (showLabelNudge) {
    statusMessage = 'Tu peux nommer tes barres en cliquant dessus → Nommer';
    statusVariant = 'relance';
  } else if (
    pieces.filter(p => p.type === 'barre' || p.type === 'jeton' || p.type === 'boite').length >= 2 &&
    pieces.some(p => p.type === 'calcul' && 'expression' in p && /[+\-×÷=]/.test((p as any).expression || '')) &&
    pieces.some(p => p.type === 'reponse' && 'text' in p && ((p as any).text?.length || 0) > 3)
  ) {
    statusMessage = 'Ta modélisation est complète! Relis le problème pour vérifier.';
  } else if (selectedPieceId) {
    statusMessage = 'Choisis une action, ou clique ailleurs pour désélectionner';
  } else {
    statusMessage = 'Clique sur une pièce pour la sélectionner';
  }

  // Nudge
  let nudgeMessage: string | undefined;
  if (!hasPieces) {
    if (isAmorcage) nudgeMessage = 'Commence par lire le problème.\nClique sur les nombres.';
    else if (isPostHighlight) nudgeMessage = 'Tu peux essayer un jeton ou une barre.';
    else if (!hasProblem) nudgeMessage = 'Tu peux commencer par placer\nun jeton ou une barre.';
  }

  return (
    <div
      style={{ display: 'flex', flexDirection: 'column', height: '100%', zoom: settings.textScale !== 1 ? settings.textScale : undefined }}
      onContextMenu={e => e.preventDefault()}
    >
      {/* Toolbar en haut — comme GéoMolo */}
      <Toolbar
        activeTool={activeTool}
        toolbarMode={settings.toolbarMode}
        onSelectTool={handleSelectTool}
        onModeChange={(mode) => setSettings(prev => ({ ...prev, toolbarMode: mode }))}
        onNewProblem={() => setShowProblemSelector(true)}
        dimmed={isAmorcage}
        availablePieces={current.availablePieces}
      />

      {/* Status bar — sous la toolbar, comme GéoMolo */}
      <StatusBar
        message={statusMessage}
        variant={statusVariant}
        showJetonQuantity={activeTool === 'jeton'}
        jetonQuantity={jetonQuantity}
        onJetonQuantityChange={setJetonQuantity}
        showTutorialButtons={tutorial.showNextButton}
        onTutorialNext={tutorial.nextStep}
        onTutorialSkip={tutorial.skipTutorial}
      />

      {/* Zone problème — visible seulement si activée (problème sélectionné ou slot avec problème) */}
      {problemZoneActive && <ProblemZone
        text={probleme}
        highlights={problemeHighlights}
        pieces={pieces}
        expanded={settings.problemAlwaysVisible || problemExpanded}
        readOnly={current.problemeReadOnly}
        isSharedProblem={isSharedProblem}
        onToggle={settings.problemAlwaysVisible ? () => {} : () => setProblemExpanded(e => !e)}
        onHighlightAdd={handleHighlightAdd}
        onHighlightRemove={handleHighlightRemove}
        onTextChange={current.problemeReadOnly ? undefined : handleTextChange}
        ttsEnabled={settings.ttsEnabled}
        ttsRate={settings.ttsRate}
        onTTSCharIndex={tts.currentCharIndex}
        onStartTTS={() => tts.speak(probleme, settings.ttsRate)}
        onStopTTS={tts.stop}
        isTTSSpeaking={tts.isSpeaking}
        guidedReadingEnabled={settings.guidedReadingEnabled}
      />}

      {/* Canvas */}
      <div style={{ flex: 1, position: 'relative', display: 'flex', flexDirection: 'column', minHeight: 0, overflow: 'hidden' }}>
        <Canvas
          pieces={pieces}
          referenceUnitMm={current.referenceUnitMm}
          activeTool={activeTool}
          selectedPieceId={selectedPieceId}
          editingPieceId={editingPieceId}
          jetonQuantity={jetonQuantity}
          deleteMode={deleteMode}
          deleteConfirmId={deleteConfirmId}
          toleranceProfile={settings.toleranceProfile}
          cursorSmoothing={settings.cursorSmoothing}
          smoothingAlpha={settings.smoothingAlpha}
          dispatch={dispatch}
          onSelectPiece={id => { setSelectedPieceId(id); setEditingPieceId(null); setDeleteConfirmId(null); }}
          onSetTool={handleSelectTool}
          onStartEdit={id => { setSelectedPieceId(id); setEditingPieceId(id); }}
          onStopEdit={() => {
            const editedPiece = pieces.find(p => p.id === editingPieceId);
            setEditingPieceId(null);
            // Keep tableau selected so the child can click another cell without re-selecting
            if (!editedPiece || editedPiece.type !== 'tableau') {
              setSelectedPieceId(null);
            }
          }}
          onDeleteClick={handleDeleteClick}
          arrowFromId={arrowFromId}
          onSetArrowFrom={setArrowFromId}
          onArrowCreated={() => setArrowFromId(null)}
          nudgeMessage={nudgeMessage}
          equalizingFromId={equalizingFromId}
          onSetEqualizingFromId={setEqualizingFromId}
          groupingBarId={groupingBarId}
          onSetGroupingBarId={setGroupingBarId}
          showSuggestedZones={appReady && settings.showSuggestedZones}
        />
        {showProblemSelector && <ProblemSelector onSelect={handleSelectProblem} onClose={() => setShowProblemSelector(false)} />}
      </div>

      {/* Action bar en bas — comme GéoMolo */}
      <ActionBar
        undoManager={undoManager}
        deleteMode={deleteMode}
        dominantHand={settings.dominantHand}
        onUndo={handleUndo}
        onRedo={handleRedo}
        onToggleDeleteMode={handleToggleDeleteMode}
        onRecommencer={handleRecommencer}
        onShowGuide={() => setShowAdultGuide(true)}
        onShowSettings={() => setShowSettings(true)}
        onShowSlotManager={() => setShowSlotManager(true)}
        onExportImage={() => {
          const svg = document.querySelector('[data-testid="canvas-svg"]') as SVGSVGElement | null;
          if (svg) exportModelisationAsPng(probleme, problemeHighlights, svg);
        }}
        onExportPdf={handleExportPdf}
        onShareLink={() => setShowSharePanel(true)}
        sessionTimer={settings.sessionTimerEnabled ? { formatted: sessionTimer.formatted, alerted: sessionTimer.alerted } : undefined}
      />

      {/* Adult guide overlay */}
      {showAdultGuide && <AdultGuide onClose={handleCloseAdultGuide} />}

      {/* Share panel overlay */}
      {showSharePanel && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', zIndex: 100, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
          onClick={() => setShowSharePanel(false)}>
          <div onClick={e => e.stopPropagation()} style={{ background: '#fff', borderRadius: 12, padding: 20, maxWidth: 480, width: '90%', boxShadow: '0 8px 32px rgba(0,0,0,0.2)' }}>
            <SharePanel problemText={probleme} pieces={pieces} onClose={() => setShowSharePanel(false)} />
          </div>
        </div>
      )}

      {/* Settings overlay */}
      {showSettings && (
        <SettingsPanel
          settings={settings}
          onChange={setSettings}
          onClose={() => setShowSettings(false)}
          onExport={handleExport}
          onImport={handleImport}
          onReset={handleReset}
        />
      )}

      {/* Slot manager overlay */}
      {showSlotManager && (
        <SlotManager
          registry={slotManager.registry}
          activeSlotId={slotManager.activeSlotId}
          onSwitchSlot={async (id) => {
            const loaded = await slotManager.switchSlot(id);
            setProblemZoneActive(loaded.current.probleme.length > 0);
            setShowSlotManager(false);
          }}
          onCreateSlot={async () => { await slotManager.createNewSlot(); setProblemZoneActive(false); setShowSlotManager(false); }}
          onDeleteSlot={slotManager.removeSlot}
          onRenameSlot={slotManager.renameSlot}
          onExportSlot={(_id) => { /* TODO: export specific slot */ }}
          onClose={() => setShowSlotManager(false)}
        />
      )}

      {/* Confirm dialog */}
      {confirmDialog && (
        <ConfirmDialog
          {...confirmDialog}
          onCancel={() => setConfirmDialog(null)}
        />
      )}
    </div>
  );
}
