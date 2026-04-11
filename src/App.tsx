import { useState, useEffect, useCallback, useRef } from 'react';
import { appReducer } from './model/state';
import type { Action } from './model/state';
import { saveSettings, clearAllStorage, exportModelisation, importModelisation } from './model/persistence';
import { exportModelisationAsPng } from './engine/share';
import { exportModelisationAsPdf } from './engine/pdf-export';
import { useAutoSave } from './hooks/useAutoSave';
import { useSlotManager } from './hooks/useSlotManager';
import type { UndoManager, ToolType, Highlight, Settings } from './model/types';
import type { SlotRegistry } from './model/slots';
import { canUndo, canRedo, undo, redo } from './model/undo';
import { useTutorial } from './hooks/useTutorial';
import { useSessionTimer } from './hooks/useSessionTimer';
import { useTTS } from './hooks/useTTS';
import { Toolbar } from './components/Toolbar';
import { MobileToolbar } from './components/MobileToolbar';
import { useViewport } from './hooks/useViewport';
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
import { TOOL_MESSAGES, AMORCAGE_WITH_PROBLEM, AMORCAGE_POST_HIGHLIGHT, AMORCAGE_NO_PROBLEM, RELANCE_QUESTIONS } from './config/messages';
import { onUndoSound, setSoundMode, setGainMultiplier } from './engine/sound';
import type { ProblemPreset } from './config/problems';

interface AppProps {
  initialRegistry: SlotRegistry;
  initialUndoManager: UndoManager;
  initialSettings: Settings;
  initialProblemZoneActive: boolean;
}

export default function App({ initialRegistry, initialUndoManager, initialSettings, initialProblemZoneActive }: AppProps) {
  const [undoManager, setUndoManager] = useState<UndoManager>(
    () => initialUndoManager
  );
  const { isMobilePortrait } = useViewport();
  const [activeTool, setActiveTool] = useState<ToolType>(null);
  const [selectedPieceId, setSelectedPieceId] = useState<string | null>(null);
  const [editingPieceId, setEditingPieceId] = useState<string | null>(null);
  const [jetonQuantity, setJetonQuantity] = useState(1);
  const [problemExpanded, setProblemExpanded] = useState(true);
  const [showProblemSelector, setShowProblemSelector] = useState(false);
  const [problemZoneActive, setProblemZoneActive] = useState(initialProblemZoneActive);
  const [showAdultGuide, setShowAdultGuide] = useState(false);
  const [showSharePanel, setShowSharePanel] = useState(false);
  const [showRelance, setShowRelance] = useState(false);
  const [relanceIndex, setRelanceIndex] = useState(0);
  const [arrowFromId, setArrowFromId] = useState<string | null>(null);
  const [focusMode, setFocusMode] = useState(false);
  const [equalizingFromId, setEqualizingFromId] = useState<string | null>(null);
  const [groupingBarId, setGroupingBarId] = useState<string | null>(null);
  const [settings, setSettings] = useState<Settings>(initialSettings);
  const [showSettings, setShowSettings] = useState(false);
  const [confirmDialog, setConfirmDialog] = useState<Omit<ConfirmDialogProps, 'onCancel'> | null>(null);
  const [showSlotManager, setShowSlotManager] = useState(false);
  const relanceTimer = useRef<ReturnType<typeof setTimeout>>(undefined);
  const inactivityTimer = useRef<ReturnType<typeof setTimeout>>(undefined);
  const [showLabelNudge, setShowLabelNudge] = useState(false);
  const labelNudgeShownRef = useRef(false);
  const skipFirstSettingsSave = useRef(true);
  const problemJustSelected = useRef(false);
  const [showInactivityRelance, setShowInactivityRelance] = useState(false);
  const [inactivityRelanceIndex, setInactivityRelanceIndex] = useState(0);

  // Fatigue detection — consecutive undos and rapid clicks
  const [showFatigueNudge, setShowFatigueNudge] = useState(false);
  const consecutiveUndos = useRef(0);
  const recentClicks = useRef<number[]>([]);
  const fatigueNudgeTimer = useRef<ReturnType<typeof setTimeout>>(undefined);

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

  // Auto-collapse problem zone when first piece is placed (free canvas space)
  const prevHadPieces = useRef(hasPieces);
  useEffect(() => {
    if (hasPieces && !prevHadPieces.current && hasProblem && !settings.problemAlwaysVisible) {
      setProblemExpanded(false);
    }
    prevHadPieces.current = hasPieces;
  }, [hasPieces, hasProblem, settings.problemAlwaysVisible]);

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
    // Reset consecutive undo counter on any non-undo action
    consecutiveUndos.current = 0;
    // Fatigue: track rapid clicks (>15 actions in 30s)
    const now = Date.now();
    recentClicks.current.push(now);
    recentClicks.current = recentClicks.current.filter(t => now - t < 30000);
    if (recentClicks.current.length > 15) {
      setShowFatigueNudge(true);
      clearTimeout(fatigueNudgeTimer.current);
      fatigueNudgeTimer.current = setTimeout(() => setShowFatigueNudge(false), 10000);
      recentClicks.current = []; // reset after triggering
    }
  }, []);

  // Slot manager — pre-loaded registry from boot()
  const slotManager = useSlotManager({ initialRegistry, undoManager, dispatch });

  const handleUndo = useCallback(() => {
    setUndoManager(prev => {
      if (!canUndo(prev)) return prev;
      onUndoSound();
      return undo(prev);
    });
    setSelectedPieceId(null);
    setEditingPieceId(null);
    // Fatigue detection: track consecutive undos
    consecutiveUndos.current += 1;
    if (consecutiveUndos.current >= 3) {
      setShowFatigueNudge(true);
      clearTimeout(fatigueNudgeTimer.current);
      fatigueNudgeTimer.current = setTimeout(() => setShowFatigueNudge(false), 10000);
    }
  }, []);

  const handleRedo = useCallback(() => {
    setUndoManager(prev => canRedo(prev) ? redo(prev) : prev);
    setSelectedPieceId(null);
    setEditingPieceId(null);
  }, []);

  // Sync sound/font/spacing — always (including first render with pre-loaded settings)
  useEffect(() => {
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

  // Persist settings — skip first render (initial value comes from boot)
  useEffect(() => {
    if (skipFirstSettingsSave.current) { skipFirstSettingsSave.current = false; return; }
    saveSettings(settings);
  }, [settings]);

  const handleCloseAdultGuide = useCallback(() => {
    setShowAdultGuide(false);
    tutorial.startTutorial();
  }, [tutorial]);

  // Ensure a slot exists as soon as content appears (any workflow)
  useEffect(() => {
    if (pieces.length > 0 || probleme.length > 0) {
      slotManager.ensureSlot();
    }
  }, [pieces.length > 0, probleme.length > 0]); // eslint-disable-line react-hooks/exhaustive-deps

  // Auto-save (slot-aware)
  const [showSaveIndicator, setShowSaveIndicator] = useState(false);
  const saveIndicatorTimer = useRef<ReturnType<typeof setTimeout>>(undefined);
  useAutoSave(undoManager, slotManager.activeSlotId, slotManager.touchActiveSlot, () => {
    setShowSaveIndicator(true);
    clearTimeout(saveIndicatorTimer.current);
    saveIndicatorTimer.current = setTimeout(() => setShowSaveIndicator(false), 2000);
  });

  // Cleanup fatigue + save timers on unmount
  useEffect(() => () => {
    clearTimeout(fatigueNudgeTimer.current);
    clearTimeout(saveIndicatorTimer.current);
  }, []);

  // beforeunload
  useEffect(() => {
    const handler = (e: BeforeUnloadEvent) => {
      if (pieces.length > 0) e.preventDefault();
    };
    window.addEventListener('beforeunload', handler);
    return () => window.removeEventListener('beforeunload', handler);
  }, [pieces.length]);

  // Keyboard — Ctrl+Z/Cmd+Z always active (universal), Escape always active
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'z') {
        // Let inputs/textareas handle their own Ctrl+Z (native undo)
        const tag = (e.target as HTMLElement)?.tagName;
        if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return;
        e.preventDefault();
        if (e.shiftKey) handleRedo();
        else handleUndo();
      }
      if (e.key === 'Escape') {
        if (editingPieceId) {
          setEditingPieceId(null);
        } else if (arrowFromId) {
          setArrowFromId(null);
        } else if (equalizingFromId) {
          setEqualizingFromId(null);
        } else if (groupingBarId) {
          setGroupingBarId(null);
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
  }, [selectedPieceId, activeTool, editingPieceId, arrowFromId, equalizingFromId, groupingBarId, handleUndo, handleRedo]);

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

  // Test-only: allow e2e tests to inject state via custom event
  useEffect(() => {
    const handler = (e: Event) => {
      const um = (e as CustomEvent).detail;
      if (um?.current?.pieces) {
        dispatch({ type: 'RESTORE', undoManager: um });
      }
    };
    window.addEventListener('test-restore', handler);
    return () => window.removeEventListener('test-restore', handler);
  }, [dispatch]);

  // When tutorial is done, show problem selector — but not if a problem was just selected
  useEffect(() => {
    if (tutorial.isDone) {
      if (problemJustSelected.current) {
        problemJustSelected.current = false;
        return;
      }
      dispatch({ type: 'SET_PROBLEM_AND_CLEAR', text: '', readOnly: false });
      setShowProblemSelector(true);
    }
  }, [tutorial.isDone, dispatch]);

  // Tool selection
  const handleSelectTool = useCallback((tool: ToolType) => {
    setArrowFromId(null);
    setEqualizingFromId(null);
    setGroupingBarId(null);
    setActiveTool(tool);
    setSelectedPieceId(null);
    setEditingPieceId(null);
  }, []);

  // Recommencer
  const handleRecommencer = useCallback(() => {
    if (pieces.length === 0 && problemeHighlights.length === 0) return;
    setConfirmDialog({
      title: 'Effacer les pièces?',
      subtitle: 'Tu peux toujours revenir avec Annuler.',
      confirmLabel: 'Oui, tout effacer',
      cancelLabel: 'Non, je continue',
      onConfirm: () => {
        dispatch({ type: 'CLEAR_PIECES' });
        setSelectedPieceId(null);
        setEditingPieceId(null);
        setActiveTool(null);
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
  const handleSelectProblem = useCallback(async (preset: ProblemPreset) => {
    problemJustSelected.current = true;
    tutorial.skipTutorial();
    // If current work has pieces, preserve it by creating a new slot
    if (pieces.length > 0) {
      await slotManager.createNewSlot();
    } else {
      slotManager.ensureSlot();
    }
    dispatch({ type: 'SET_PROBLEM_AND_CLEAR', text: preset.text, readOnly: preset.text.length > 0 });
    setShowProblemSelector(false);
    setProblemZoneActive(true);
    setSelectedPieceId(null);
    setEditingPieceId(null);
    setActiveTool(null);
    // Auto-name slot from problem (if slot still has default name)
    if (slotManager.activeSlotId && preset.text) {
      const active = slotManager.registry.slots.find(s => s.id === slotManager.activeSlotId);
      if (active && /^Travail \d+$/.test(active.name)) {
        const name = preset.title || (preset.text.length > 40 ? preset.text.slice(0, 40) + '…' : preset.text);
        slotManager.renameSlot(active.id, name);
      }
    }
  }, [dispatch, tutorial, slotManager, pieces.length]);

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

  if (equalizingFromId) {
    statusMessage = 'Clique sur la barre à redimensionner';
  } else if (groupingBarId) {
    statusMessage = 'Clique sur les barres à ajouter au groupe.';
    statusVariant = 'relance'; // highlight to show active mode
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
  } else if (settings.sessionTimerEnabled && sessionTimer.alerted) {
    statusMessage = 'Tu travailles depuis un moment — prends une pause si tu veux';
    statusVariant = 'relance';
  } else if (showLabelNudge) {
    statusMessage = 'Tu peux nommer tes barres en cliquant dessus → Nommer';
  } else if (
    pieces.filter(p => p.type === 'barre' || p.type === 'jeton' || p.type === 'boite').length >= 2 &&
    pieces.some(p => p.type === 'calcul' && 'expression' in p && /[+\-×÷=]/.test((p as any).expression || '')) &&
    pieces.some(p => p.type === 'reponse' && 'text' in p && ((p as any).text?.length || 0) > 3)
  ) {
    statusMessage = 'Tu as écrit ta réponse. Relis le problème pour vérifier.';
  } else if (selectedPieceId && pieces.find(p => p.id === selectedPieceId)?.type === 'arbre') {
    statusMessage = 'Clique sur un nœud pour le renommer. Actions et gabarits à droite.';
  } else if (selectedPieceId && pieces.find(p => p.id === selectedPieceId)?.type === 'droiteNumerique') {
    statusMessage = 'Clique sur la droite pour placer un marqueur. Actions à droite.';
  } else if (selectedPieceId) {
    statusMessage = 'Choisis une action, ou clique ailleurs pour désélectionner';
  } else if ((() => {
    // Suggest "Ranger" when movable pieces occupy >60% of canvas width heuristically
    const movable = pieces.filter(p => !p.locked && p.type !== 'fleche' && p.type !== 'etiquette' && p.type !== 'inconnue');
    return movable.length >= 5 && movable.filter(p => p.type === 'barre' || p.type === 'schema' || p.type === 'diagrammeBandes' || p.type === 'diagrammeLigne' || p.type === 'droiteNumerique' || p.type === 'arbre').length >= 3;
  })()) {
    statusMessage = 'Beaucoup de pièces — essaie le bouton Ranger en bas à droite du canevas';
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
      {/* Toolbar en haut (desktop/tablette) ou en bas (mobile portrait) */}
      {!isMobilePortrait && (
        <Toolbar
          activeTool={activeTool}
          toolbarMode={settings.toolbarMode}
          onSelectTool={handleSelectTool}
          onModeChange={(mode) => setSettings(prev => ({ ...prev, toolbarMode: mode }))}
          onNewProblem={() => setShowProblemSelector(true)}
          dimmed={isAmorcage}
          availablePieces={current.availablePieces}
        />
      )}

      {/* Status bar — sous la toolbar, comme GéoMolo */}
      <StatusBar
        message={statusMessage}
        variant={statusVariant}
        cancelLabel={groupingBarId ? '✓ Terminer' : undefined}
        onCancel={(activeTool || equalizingFromId || groupingBarId) ? () => {
          if (equalizingFromId) setEqualizingFromId(null);
          else if (groupingBarId) setGroupingBarId(null);
          else if (activeTool) { setActiveTool(null); setArrowFromId(null); }
        } : undefined}
        showJetonQuantity={activeTool === 'jeton'}
        jetonQuantity={jetonQuantity}
        onJetonQuantityChange={setJetonQuantity}
        showTutorialButtons={tutorial.showNextButton}
        onTutorialNext={tutorial.nextStep}
        onTutorialSkip={tutorial.skipTutorial}
        problemCollapsed={problemZoneActive && !(settings.problemAlwaysVisible || problemExpanded) && probleme.length > 0}
        problemText={probleme}
        onExpandProblem={() => setProblemExpanded(true)}
        fatigueNudge={showFatigueNudge}
        onDismissFatigueNudge={() => setShowFatigueNudge(false)}
      />

      {/* Zone problème — visible seulement si activée (problème sélectionné ou slot avec problème) */}
      {problemZoneActive && <ProblemZone
        text={probleme}
        highlights={problemeHighlights}
        pieces={pieces}
        expanded={settings.problemAlwaysVisible || problemExpanded}
        readOnly={current.problemeReadOnly}
        onToggle={settings.problemAlwaysVisible ? () => {} : () => setProblemExpanded(e => !e)}
        onHighlightAdd={handleHighlightAdd}
        onHighlightRemove={handleHighlightRemove}
        onTextChange={handleTextChange}
        ttsEnabled={settings.ttsEnabled}
        ttsRate={settings.ttsRate}
        onTTSCharIndex={tts.currentCharIndex}
        onStartTTS={() => tts.speak(probleme, settings.ttsRate)}
        onStopTTS={tts.stop}
        isTTSSpeaking={tts.isSpeaking}
        guidedReadingEnabled={settings.guidedReadingEnabled}
      />}

      {/* Canvas */}
      <div style={{ flex: 1, position: 'relative', display: 'flex', flexDirection: 'column', minHeight: 0, overflow: 'hidden', paddingBottom: isMobilePortrait ? 64 : 0 }}>
        <Canvas
          pieces={pieces}
          referenceUnitMm={current.referenceUnitMm}
          activeTool={activeTool}
          selectedPieceId={selectedPieceId}
          editingPieceId={editingPieceId}
          jetonQuantity={jetonQuantity}
          toleranceProfile={settings.toleranceProfile}
          cursorSmoothing={settings.cursorSmoothing}
          smoothingAlpha={settings.smoothingAlpha}
          dispatch={dispatch}
          onSelectPiece={id => { setSelectedPieceId(id); setEditingPieceId(null); }}
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
          arrowFromId={arrowFromId}
          onSetArrowFrom={setArrowFromId}
          onArrowCreated={() => setArrowFromId(null)}
          nudgeMessage={nudgeMessage}
          equalizingFromId={equalizingFromId}
          onSetEqualizingFromId={setEqualizingFromId}
          groupingBarId={groupingBarId}
          onSetGroupingBarId={setGroupingBarId}
          showSuggestedZones={settings.showSuggestedZones}
          showTokenCounter={settings.showTokenCounter}
          highContrast={settings.highContrast}
          textScale={settings.textScale}
          focusMode={focusMode}
        />
        {showProblemSelector && <ProblemSelector onSelect={handleSelectProblem} onClose={() => setShowProblemSelector(false)} />}
      </div>

      {/* Action bar en bas — comme GéoMolo */}
      <ActionBar
        undoManager={undoManager}
        focusMode={focusMode}
        dominantHand={settings.dominantHand}
        onUndo={handleUndo}
        onRedo={handleRedo}
        onToggleFocusMode={() => setFocusMode(f => !f)}
        onRecommencer={handleRecommencer}
        onShowGuide={() => setShowAdultGuide(true)}
        onStartTutorial={() => tutorial.startTutorial()}
        onShowSettings={() => setShowSettings(true)}
        onShowSlotManager={() => setShowSlotManager(true)}
        onExportImage={() => {
          const svg = document.querySelector('[data-testid="canvas-svg"]') as SVGSVGElement | null;
          if (svg) exportModelisationAsPng(probleme, problemeHighlights, svg);
        }}
        onExportPdf={handleExportPdf}
        onShareLink={() => setShowSharePanel(true)}
        sessionTimer={settings.sessionTimerEnabled ? { formatted: sessionTimer.formatted, alerted: sessionTimer.alerted } : undefined}
        activeProfile={settings.activeProfile}
        showSaveIndicator={showSaveIndicator}
      />

      {/* Mobile bottom toolbar */}
      {isMobilePortrait && (
        <MobileToolbar
          activeTool={activeTool}
          toolbarMode={settings.toolbarMode}
          onSelectTool={handleSelectTool}
          dimmed={isAmorcage}
          availablePieces={current.availablePieces}
        />
      )}

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
