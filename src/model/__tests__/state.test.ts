import { describe, it, expect } from 'vitest';
import { createInitialAppState, appReducer } from '../state';
import type { Action, AppState } from '../state';
import type { Jeton, Barre, Fleche, Etiquette, Boite, Tableau, Arbre, Schema, Inconnue, DiagrammeBandes, DiagrammeLigne, ModelisationState } from '../types';
import { REFERENCE_UNIT_MM } from '../types';
// pushState imported via appReducer tests indirectly

// === Helpers ===

function makeJeton(overrides: Partial<Jeton> = {}): Jeton {
  return { id: 'j1', type: 'jeton', x: 100, y: 100, locked: false, couleur: 'bleu', parentId: null, ...overrides };
}

function makeBarre(overrides: Partial<Barre> = {}): Barre {
  return { id: 'b1', type: 'barre', x: 100, y: 100, locked: false, couleur: 'bleu', sizeMultiplier: 1, label: '', value: '', divisions: null, coloredParts: [], showFraction: false, groupId: null, groupLabel: null, ...overrides };
}

function makeFleche(overrides: Partial<Fleche> = {}): Fleche {
  return { id: 'f1', type: 'fleche', x: 0, y: 0, locked: false, fromId: 'j1', toId: 'j2', label: '', ...overrides };
}

function makeEtiquette(overrides: Partial<Etiquette> = {}): Etiquette {
  return { id: 'e1', type: 'etiquette', x: 100, y: 80, locked: false, text: 'label', attachedTo: null, ...overrides };
}

function makeBoite(overrides: Partial<Boite> = {}): Boite {
  return { id: 'box1', type: 'boite', x: 50, y: 50, locked: false, width: 80, height: 60, label: '', value: '', couleur: 'bleu', ...overrides };
}

/** Dispatch an action through appReducer and return the new model state. */
function dispatch(appState: AppState, action: Action): AppState {
  return appReducer(appState, action);
}

function currentModel(appState: AppState): ModelisationState {
  return appState.undoManager.current;
}

function freshApp(): AppState {
  return createInitialAppState();
}

// === reduceModelisation (via appReducer) ===

describe('reduceModelisation', () => {
  describe('PLACE_PIECE', () => {
    it('adds piece to pieces array', () => {
      const app = freshApp();
      const jeton = makeJeton();
      const next = dispatch(app, { type: 'PLACE_PIECE', piece: jeton });
      expect(currentModel(next).pieces).toHaveLength(1);
      expect(currentModel(next).pieces[0]).toEqual(jeton);
    });
  });

  describe('PLACE_PIECES', () => {
    it('adds multiple pieces', () => {
      const app = freshApp();
      const j1 = makeJeton({ id: 'j1' });
      const j2 = makeJeton({ id: 'j2', x: 200 });
      const next = dispatch(app, { type: 'PLACE_PIECES', pieces: [j1, j2] });
      expect(currentModel(next).pieces).toHaveLength(2);
    });

    it('duplicate boite with children — jetons point to new boite', () => {
      let app = freshApp();
      app = dispatch(app, { type: 'PLACE_PIECE', piece: makeBoite({ id: 'box1', x: 50, y: 50 }) });
      // Simulate duplication: new boite + 2 child jetons
      const newBoite = makeBoite({ id: 'box2', x: 140, y: 50 });
      const j1 = makeJeton({ id: 'j1', x: 150, y: 60, parentId: 'box2' });
      const j2 = makeJeton({ id: 'j2', x: 160, y: 60, parentId: 'box2' });
      app = dispatch(app, { type: 'PLACE_PIECES', pieces: [newBoite, j1, j2] });
      expect(currentModel(app).pieces.filter(p => p.type === 'boite')).toHaveLength(2);
      expect(currentModel(app).pieces.filter(p => p.type === 'jeton' && (p as any).parentId === 'box2')).toHaveLength(2);
    });

    it('duplicate empty boite (no children)', () => {
      let app = freshApp();
      app = dispatch(app, { type: 'PLACE_PIECE', piece: makeBoite({ id: 'box1', x: 50, y: 50 }) });
      const newBoite = makeBoite({ id: 'box2', x: 140, y: 50 });
      app = dispatch(app, { type: 'PLACE_PIECES', pieces: [newBoite] });
      expect(currentModel(app).pieces.filter(p => p.type === 'boite')).toHaveLength(2);
    });
  });

  describe('MOVE_PIECE', () => {
    it('updates x/y of the piece', () => {
      let app = freshApp();
      app = dispatch(app, { type: 'PLACE_PIECE', piece: makeJeton() });
      app = dispatch(app, { type: 'MOVE_PIECE', id: 'j1', x: 200, y: 300 });

      const moved = currentModel(app).pieces.find(p => p.id === 'j1')!;
      expect(moved.x).toBe(200);
      expect(moved.y).toBe(300);
    });

    it('moves attached etiquettes with the piece', () => {
      let app = freshApp();
      const barre = makeBarre({ id: 'b1', x: 100, y: 100 });
      const etiq = makeEtiquette({ id: 'e1', x: 120, y: 80, attachedTo: 'b1' });
      app = dispatch(app, { type: 'PLACE_PIECE', piece: barre });
      app = dispatch(app, { type: 'PLACE_PIECE', piece: etiq });
      app = dispatch(app, { type: 'MOVE_PIECE', id: 'b1', x: 200, y: 200 });

      const movedEtiq = currentModel(app).pieces.find(p => p.id === 'e1')!;
      // dx = 200-100 = 100, dy = 200-100 = 100
      expect(movedEtiq.x).toBe(220); // 120 + 100
      expect(movedEtiq.y).toBe(180); // 80 + 100
    });

    it('boite moves its child jetons (parentId)', () => {
      let app = freshApp();
      const boite = makeBoite({ id: 'box1', x: 50, y: 50 });
      const jeton = makeJeton({ id: 'j1', x: 70, y: 70, parentId: 'box1' });
      app = dispatch(app, { type: 'PLACE_PIECE', piece: boite });
      app = dispatch(app, { type: 'PLACE_PIECE', piece: jeton });
      app = dispatch(app, { type: 'MOVE_PIECE', id: 'box1', x: 150, y: 150 });

      const movedJeton = currentModel(app).pieces.find(p => p.id === 'j1')!;
      // dx = 150-50 = 100, dy = 150-50 = 100
      expect(movedJeton.x).toBe(170); // 70 + 100
      expect(movedJeton.y).toBe(170); // 70 + 100
    });
  });

  describe('MOVE_PIECE_LIVE', () => {
    it('updates position without undo push', () => {
      let app = freshApp();
      app = dispatch(app, { type: 'PLACE_PIECE', piece: makeJeton() });
      const pastLengthBefore = app.undoManager.past.length;

      app = dispatch(app, { type: 'MOVE_PIECE_LIVE', id: 'j1', x: 200, y: 200 });

      const moved = currentModel(app).pieces.find(p => p.id === 'j1')!;
      expect(moved.x).toBe(200);
      expect(moved.y).toBe(200);
      // MOVE_PIECE_LIVE should NOT push to past (no undo entry)
      expect(app.undoManager.past.length).toBe(pastLengthBefore);
    });
  });

  describe('EDIT_PIECE', () => {
    it('merges changes into piece', () => {
      let app = freshApp();
      app = dispatch(app, { type: 'PLACE_PIECE', piece: makeBarre({ id: 'b1', label: 'old' }) });
      app = dispatch(app, { type: 'EDIT_PIECE', id: 'b1', changes: { label: 'new', value: '42' } });

      const edited = currentModel(app).pieces.find(p => p.id === 'b1')! as Barre;
      expect(edited.label).toBe('new');
      expect(edited.value).toBe('42');
    });

    it('strips type and id from changes (I5 fix)', () => {
      let app = freshApp();
      app = dispatch(app, { type: 'PLACE_PIECE', piece: makeBarre({ id: 'b1' }) });
      app = dispatch(app, { type: 'EDIT_PIECE', id: 'b1', changes: { type: 'jeton', id: 'hacked', label: 'safe' } });

      const edited = currentModel(app).pieces.find(p => p.id === 'b1')!;
      expect(edited.type).toBe('barre'); // type not overwritten
      expect(edited.id).toBe('b1'); // id not overwritten
      expect((edited as Barre).label).toBe('safe');
    });
  });

  describe('DELETE_PIECE', () => {
    it('removes piece', () => {
      let app = freshApp();
      app = dispatch(app, { type: 'PLACE_PIECE', piece: makeJeton({ id: 'j1' }) });
      app = dispatch(app, { type: 'DELETE_PIECE', id: 'j1' });
      expect(currentModel(app).pieces).toHaveLength(0);
    });

    it('cascade -- deletes attached fleches', () => {
      let app = freshApp();
      const j1 = makeJeton({ id: 'j1' });
      const j2 = makeJeton({ id: 'j2', x: 200 });
      const fl = makeFleche({ id: 'f1', fromId: 'j1', toId: 'j2' });
      app = dispatch(app, { type: 'PLACE_PIECE', piece: j1 });
      app = dispatch(app, { type: 'PLACE_PIECE', piece: j2 });
      app = dispatch(app, { type: 'PLACE_PIECE', piece: fl });

      app = dispatch(app, { type: 'DELETE_PIECE', id: 'j1' });
      // fleche should be cascade-deleted since fromId === 'j1'
      expect(currentModel(app).pieces.find(p => p.id === 'f1')).toBeUndefined();
      // j2 still exists
      expect(currentModel(app).pieces.find(p => p.id === 'j2')).toBeDefined();
    });

    it('cascade -- deletes attached etiquettes', () => {
      let app = freshApp();
      const barre = makeBarre({ id: 'b1' });
      const etiq = makeEtiquette({ id: 'e1', attachedTo: 'b1' });
      app = dispatch(app, { type: 'PLACE_PIECE', piece: barre });
      app = dispatch(app, { type: 'PLACE_PIECE', piece: etiq });

      app = dispatch(app, { type: 'DELETE_PIECE', id: 'b1' });
      expect(currentModel(app).pieces.find(p => p.id === 'e1')).toBeUndefined();
    });

    it('cascade -- deletes child jetons (removes parentId references)', () => {
      let app = freshApp();
      const boite = makeBoite({ id: 'box1' });
      const jeton = makeJeton({ id: 'j1', parentId: 'box1', x: 70, y: 70 });
      app = dispatch(app, { type: 'PLACE_PIECE', piece: boite });
      app = dispatch(app, { type: 'PLACE_PIECE', piece: jeton });

      app = dispatch(app, { type: 'DELETE_PIECE', id: 'box1' });
      // Based on the reducer: p.type === 'jeton' && p.parentId === deletedId => filtered out
      expect(currentModel(app).pieces.find(p => p.id === 'j1')).toBeUndefined();
    });
  });

  describe('HIGHLIGHT_ADD / HIGHLIGHT_REMOVE', () => {
    it('adds a highlight', () => {
      let app = freshApp();
      app = dispatch(app, { type: 'HIGHLIGHT_ADD', highlight: { start: 0, end: 5, color: 'bleu' } });
      expect(currentModel(app).problemeHighlights).toHaveLength(1);
      expect(currentModel(app).problemeHighlights[0]).toEqual({ start: 0, end: 5, color: 'bleu' });
    });

    it('removes a highlight', () => {
      let app = freshApp();
      app = dispatch(app, { type: 'HIGHLIGHT_ADD', highlight: { start: 0, end: 5, color: 'bleu' } });
      app = dispatch(app, { type: 'HIGHLIGHT_ADD', highlight: { start: 10, end: 15, color: 'orange' } });
      app = dispatch(app, { type: 'HIGHLIGHT_REMOVE', start: 0, end: 5 });
      expect(currentModel(app).problemeHighlights).toHaveLength(1);
      expect(currentModel(app).problemeHighlights[0].start).toBe(10);
    });
  });

  describe('SET_PROBLEM', () => {
    it('sets problem text and clears highlights', () => {
      let app = freshApp();
      app = dispatch(app, { type: 'HIGHLIGHT_ADD', highlight: { start: 0, end: 5, color: 'bleu' } });
      app = dispatch(app, { type: 'SET_PROBLEM', text: 'New problem', readOnly: true });

      expect(currentModel(app).probleme).toBe('New problem');
      expect(currentModel(app).problemeReadOnly).toBe(true);
      expect(currentModel(app).problemeHighlights).toEqual([]);
    });
  });

  describe('SET_PROBLEM_AND_CLEAR', () => {
    it('clears pieces and highlights', () => {
      let app = freshApp();
      app = dispatch(app, { type: 'PLACE_PIECE', piece: makeJeton() });
      app = dispatch(app, { type: 'HIGHLIGHT_ADD', highlight: { start: 0, end: 5, color: 'bleu' } });
      app = dispatch(app, { type: 'SET_PROBLEM_AND_CLEAR', text: 'Fresh', readOnly: false });

      expect(currentModel(app).probleme).toBe('Fresh');
      expect(currentModel(app).pieces).toEqual([]);
      expect(currentModel(app).problemeHighlights).toEqual([]);
    });
  });

  describe('CLEAR_PIECES', () => {
    it('empties pieces array', () => {
      let app = freshApp();
      app = dispatch(app, { type: 'PLACE_PIECE', piece: makeJeton() });
      app = dispatch(app, { type: 'PLACE_PIECE', piece: makeBarre({ id: 'b1' }) });
      app = dispatch(app, { type: 'CLEAR_PIECES' });

      expect(currentModel(app).pieces).toEqual([]);
    });
  });

  describe('ARRANGE_PIECES', () => {
    it('moves specified pieces to new positions', () => {
      let app = freshApp();
      const j1 = makeJeton({ id: 'j1', x: 10, y: 10 });
      const j2 = makeJeton({ id: 'j2', x: 20, y: 20 });
      app = dispatch(app, { type: 'PLACE_PIECES', pieces: [j1, j2] });
      app = dispatch(app, {
        type: 'ARRANGE_PIECES',
        moves: [
          { id: 'j1', x: 100, y: 200 },
          { id: 'j2', x: 300, y: 400 },
        ],
      });

      const p1 = currentModel(app).pieces.find(p => p.id === 'j1')!;
      const p2 = currentModel(app).pieces.find(p => p.id === 'j2')!;
      expect(p1.x).toBe(100);
      expect(p1.y).toBe(200);
      expect(p2.x).toBe(300);
      expect(p2.y).toBe(400);
    });
  });

  describe('UNGROUP_BARRES', () => {
    it('clears groupId/groupLabel atomically', () => {
      let app = freshApp();
      const b1 = makeBarre({ id: 'b1', groupId: 'g1', groupLabel: 'Group A' });
      const b2 = makeBarre({ id: 'b2', groupId: 'g1', groupLabel: 'Group A', x: 200 });
      const b3 = makeBarre({ id: 'b3', groupId: 'g2', groupLabel: 'Group B', x: 300 });
      app = dispatch(app, { type: 'PLACE_PIECES', pieces: [b1, b2, b3] });
      app = dispatch(app, { type: 'UNGROUP_BARRES', groupId: 'g1' });

      const pieces = currentModel(app).pieces;
      const ub1 = pieces.find(p => p.id === 'b1')! as Barre;
      const ub2 = pieces.find(p => p.id === 'b2')! as Barre;
      const ub3 = pieces.find(p => p.id === 'b3')! as Barre;
      expect(ub1.groupId).toBeNull();
      expect(ub1.groupLabel).toBeNull();
      expect(ub2.groupId).toBeNull();
      expect(ub2.groupLabel).toBeNull();
      // b3 is in a different group -- untouched
      expect(ub3.groupId).toBe('g2');
      expect(ub3.groupLabel).toBe('Group B');
    });
  });
});

// === Auto-scaling tests ===

describe('autoScaleReference', () => {
  it('bar with multiplier 8 at 60mm -- reference shrinks to fit 470mm', () => {
    let app = freshApp();
    // referenceUnitMm defaults to 60
    expect(currentModel(app).referenceUnitMm).toBe(REFERENCE_UNIT_MM); // 60

    // Place barre with sizeMultiplier=8: 8 * 60 = 480 > 470, should trigger auto-scale
    const barre = makeBarre({ id: 'b1', sizeMultiplier: 8 });
    app = dispatch(app, { type: 'PLACE_PIECE', piece: barre });

    // maxWidth=470, Math.floor(470/8)=58
    expect(currentModel(app).referenceUnitMm).toBe(58);
  });

  it('floor at 10mm', () => {
    let app = freshApp();
    // Place barre with very large multiplier: e.g. 100
    // 100 * 60 = 6000 >> 470, Math.floor(470/100) = 4 < 10 => floor at 10
    const barre = makeBarre({ id: 'b1', sizeMultiplier: 100 });
    app = dispatch(app, { type: 'PLACE_PIECE', piece: barre });

    expect(currentModel(app).referenceUnitMm).toBe(10);
  });
});

describe('autoRestoreReference', () => {
  it('after deleting large bar -- reference restores to 60mm', () => {
    let app = freshApp();
    // Place a small bar (doesn't trigger scaling) and a large bar (triggers scaling)
    const smallBar = makeBarre({ id: 'b_small', sizeMultiplier: 2 });
    const largeBar = makeBarre({ id: 'b_large', sizeMultiplier: 8, x: 200 });
    app = dispatch(app, { type: 'PLACE_PIECE', piece: smallBar });
    app = dispatch(app, { type: 'PLACE_PIECE', piece: largeBar });

    // Reference should be scaled down
    expect(currentModel(app).referenceUnitMm).toBeLessThan(REFERENCE_UNIT_MM);

    // Delete the large bar
    app = dispatch(app, { type: 'DELETE_PIECE', id: 'b_large' });

    // With only sizeMultiplier=2 remaining, ideal = min(60, floor(470/2)) = 60
    expect(currentModel(app).referenceUnitMm).toBe(REFERENCE_UNIT_MM);
  });
});

// === Auto-resize boite ===

describe('autoResizeBoite', () => {
  it('placing multiple jetons with parentId grows boite', () => {
    let app = freshApp();
    const boite = makeBoite({ id: 'box1', x: 50, y: 50, width: 40, height: 30 });
    app = dispatch(app, { type: 'PLACE_PIECE', piece: boite });

    // Place two jetons far apart inside the box reference
    // j1 at (30, 40), j2 at (150, 140)
    // minX = 30-10=20, maxX=150+10=160 => span = 140 > 40
    // minY = 40-10=30, maxY=140+10=150 => span = 120 > 30
    const j1 = makeJeton({ id: 'j1', x: 30, y: 40, parentId: 'box1' });
    const j2 = makeJeton({ id: 'j2', x: 150, y: 140, parentId: 'box1' });
    app = dispatch(app, { type: 'PLACE_PIECES', pieces: [j1, j2] });

    const box = currentModel(app).pieces.find(p => p.id === 'box1')! as Boite;
    // newWidth = max(40, 160-20) = max(40, 140) = 140
    // newHeight = max(30, 150-30) = max(30, 120) = 120
    // newX = min(50, 20) = 20
    // newY = min(50, 30) = 30
    expect(box.width).toBe(140);
    expect(box.height).toBe(120);
    expect(box.x).toBe(20);
    expect(box.y).toBe(30);
  });
});

// === appReducer top-level ===

describe('appReducer', () => {
  describe('UNDO / REDO', () => {
    it('UNDO restores previous state via undo manager', () => {
      let app = freshApp();
      app = dispatch(app, { type: 'PLACE_PIECE', piece: makeJeton({ id: 'j1' }) });
      expect(currentModel(app).pieces).toHaveLength(1);

      app = dispatch(app, { type: 'UNDO' });
      expect(currentModel(app).pieces).toHaveLength(0);
    });

    it('REDO restores undone state', () => {
      let app = freshApp();
      app = dispatch(app, { type: 'PLACE_PIECE', piece: makeJeton({ id: 'j1' }) });
      app = dispatch(app, { type: 'UNDO' });
      expect(currentModel(app).pieces).toHaveLength(0);

      app = dispatch(app, { type: 'REDO' });
      expect(currentModel(app).pieces).toHaveLength(1);
    });

    it('UNDO clears selectedPieceId and editingPieceId', () => {
      let app = freshApp();
      app = dispatch(app, { type: 'PLACE_PIECE', piece: makeJeton({ id: 'j1' }) });
      // Simulate selection (manually set for test)
      app = { ...app, selectedPieceId: 'j1', editingPieceId: 'j1' };
      app = dispatch(app, { type: 'UNDO' });
      expect(app.selectedPieceId).toBeNull();
      expect(app.editingPieceId).toBeNull();
    });
  });

  describe('RESTORE', () => {
    it('replaces entire undoManager', () => {
      let app = freshApp();
      app = dispatch(app, { type: 'PLACE_PIECE', piece: makeJeton({ id: 'j1' }) });

      // Build a different state
      let app2 = freshApp();
      app2 = dispatch(app2, { type: 'PLACE_PIECE', piece: makeBarre({ id: 'b99' }) });
      app2 = dispatch(app2, { type: 'PLACE_PIECE', piece: makeBarre({ id: 'b100', x: 200 }) });

      // Restore app1 with app2's undoManager
      app = dispatch(app, { type: 'RESTORE', undoManager: app2.undoManager });

      expect(currentModel(app).pieces).toHaveLength(2);
      expect(currentModel(app).pieces[0].id).toBe('b99');
      expect(app.selectedPieceId).toBeNull();
      expect(app.editingPieceId).toBeNull();
    });
  });

  // === REPARTIR_JETONS ===

  describe('REPARTIR_JETONS', () => {
    it('distributes N jetons into K groups evenly', () => {
      let app = freshApp();
      // Place 6 free jetons
      for (let i = 0; i < 6; i++) {
        app = dispatch(app, { type: 'PLACE_PIECE', piece: makeJeton({ id: `j${i}`, x: 50 + i * 10, y: 50 }) });
      }
      app = dispatch(app, {
        type: 'REPARTIR_JETONS',
        jetonIds: ['j0', 'j1', 'j2', 'j3', 'j4', 'j5'],
        groupCount: 3,
        startX: 50, startY: 100,
      });

      const pieces = currentModel(app).pieces;
      const boites = pieces.filter(p => p.type === 'boite') as Boite[];
      const jetons = pieces.filter(p => p.type === 'jeton') as Jeton[];
      expect(boites).toHaveLength(3);
      expect(jetons).toHaveLength(6);
      // Each boîte has 2 jetons
      for (const boite of boites) {
        const children = jetons.filter(j => j.parentId === boite.id);
        expect(children).toHaveLength(2);
      }
    });

    it('handles remainder — extra jetons stay free', () => {
      let app = freshApp();
      for (let i = 0; i < 7; i++) {
        app = dispatch(app, { type: 'PLACE_PIECE', piece: makeJeton({ id: `j${i}`, x: 50 + i * 10, y: 50 }) });
      }
      app = dispatch(app, {
        type: 'REPARTIR_JETONS',
        jetonIds: ['j0', 'j1', 'j2', 'j3', 'j4', 'j5', 'j6'],
        groupCount: 3,
        startX: 50, startY: 100,
      });

      const pieces = currentModel(app).pieces;
      const boites = pieces.filter(p => p.type === 'boite') as Boite[];
      const jetons = pieces.filter(p => p.type === 'jeton') as Jeton[];
      expect(boites).toHaveLength(3);
      // 3 groups of 2 = 6 assigned, 1 free
      const assigned = jetons.filter(j => j.parentId !== null);
      const free = jetons.filter(j => j.parentId === null);
      expect(assigned).toHaveLength(6);
      expect(free).toHaveLength(1);
    });

    it('guards: does nothing with 0 jetons', () => {
      let app = freshApp();
      app = dispatch(app, {
        type: 'REPARTIR_JETONS', jetonIds: [], groupCount: 3, startX: 50, startY: 100,
      });
      expect(currentModel(app).pieces).toHaveLength(0);
    });

    it('guards: does nothing with groupCount < 2', () => {
      let app = freshApp();
      app = dispatch(app, { type: 'PLACE_PIECE', piece: makeJeton({ id: 'j1' }) });
      app = dispatch(app, {
        type: 'REPARTIR_JETONS', jetonIds: ['j1'], groupCount: 1, startX: 50, startY: 100,
      });
      expect(currentModel(app).pieces.filter(p => p.type === 'boite')).toHaveLength(0);
    });

    it('preserves jeton colors', () => {
      let app = freshApp();
      app = dispatch(app, { type: 'PLACE_PIECE', piece: makeJeton({ id: 'j1', couleur: 'rouge' }) });
      app = dispatch(app, { type: 'PLACE_PIECE', piece: makeJeton({ id: 'j2', couleur: 'vert' }) });
      app = dispatch(app, {
        type: 'REPARTIR_JETONS', jetonIds: ['j1', 'j2'], groupCount: 2, startX: 50, startY: 100,
      });

      const j1 = currentModel(app).pieces.find(p => p.id === 'j1') as Jeton;
      const j2 = currentModel(app).pieces.find(p => p.id === 'j2') as Jeton;
      expect(j1.couleur).toBe('rouge');
      expect(j2.couleur).toBe('vert');
    });

    it('labels boîtes Groupe 1, Groupe 2, etc.', () => {
      let app = freshApp();
      for (let i = 0; i < 4; i++) {
        app = dispatch(app, { type: 'PLACE_PIECE', piece: makeJeton({ id: `j${i}`, x: 50, y: 50 }) });
      }
      app = dispatch(app, {
        type: 'REPARTIR_JETONS', jetonIds: ['j0', 'j1', 'j2', 'j3'], groupCount: 2, startX: 50, startY: 100,
      });

      const boites = currentModel(app).pieces.filter(p => p.type === 'boite') as Boite[];
      expect(boites[0].label).toBe('Groupe 1');
      expect(boites[1].label).toBe('Groupe 2');
    });

    it('is undoable in a single step', () => {
      let app = freshApp();
      for (let i = 0; i < 4; i++) {
        app = dispatch(app, { type: 'PLACE_PIECE', piece: makeJeton({ id: `j${i}`, x: 50, y: 50 }) });
      }
      const beforeRepartir = currentModel(app).pieces.length;
      app = dispatch(app, {
        type: 'REPARTIR_JETONS', jetonIds: ['j0', 'j1', 'j2', 'j3'], groupCount: 2, startX: 50, startY: 100,
      });
      expect(currentModel(app).pieces.filter(p => p.type === 'boite')).toHaveLength(2);

      // Undo — boîtes gone, jetons back to original positions
      app = dispatch(app, { type: 'UNDO' });
      expect(currentModel(app).pieces).toHaveLength(beforeRepartir);
      expect(currentModel(app).pieces.filter(p => p.type === 'boite')).toHaveLength(0);
      const j0 = currentModel(app).pieces.find(p => p.id === 'j0') as Jeton;
      expect(j0.parentId).toBeNull();
    });
  });

  // === Fractional bar sizes ===

  describe('Fractional bar sizes', () => {
    it('accepts fractional sizeMultiplier', () => {
      let app = freshApp();
      app = dispatch(app, { type: 'PLACE_PIECE', piece: makeBarre({ id: 'b1', sizeMultiplier: 0.5 }) });
      const bar = currentModel(app).pieces[0] as Barre;
      expect(bar.sizeMultiplier).toBe(0.5);
    });

    it('auto-scales with fractional multiplier (large bar triggers scale)', () => {
      let app = freshApp();
      // A 10× bar at default 60mm = 600mm > 470mm → triggers auto-scale
      app = dispatch(app, { type: 'PLACE_PIECE', piece: makeBarre({ id: 'b1', sizeMultiplier: 10 }) });
      const ref1 = currentModel(app).referenceUnitMm;
      expect(ref1).toBeLessThan(REFERENCE_UNIT_MM);

      // A 0.5× bar doesn't affect auto-scale (it's small)
      app = dispatch(app, { type: 'PLACE_PIECE', piece: makeBarre({ id: 'b2', sizeMultiplier: 0.5 }) });
      expect(currentModel(app).referenceUnitMm).toBe(ref1);
    });

    it('resizing to fractional value via EDIT_PIECE works', () => {
      let app = freshApp();
      app = dispatch(app, { type: 'PLACE_PIECE', piece: makeBarre({ id: 'b1', sizeMultiplier: 1 }) });
      app = dispatch(app, { type: 'EDIT_PIECE', id: 'b1', changes: { sizeMultiplier: 0.75 } });
      const bar = currentModel(app).pieces[0] as Barre;
      expect(bar.sizeMultiplier).toBe(0.75);
    });

    it('fractional bar with subdivisions and colored parts', () => {
      let app = freshApp();
      app = dispatch(app, { type: 'PLACE_PIECE', piece: makeBarre({
        id: 'b1', sizeMultiplier: 0.5, divisions: 4, coloredParts: [0, 1, 2], showFraction: true,
      }) });
      const bar = currentModel(app).pieces[0] as Barre;
      expect(bar.sizeMultiplier).toBe(0.5);
      expect(bar.divisions).toBe(4);
      expect(bar.coloredParts).toEqual([0, 1, 2]);
      expect(bar.showFraction).toBe(true);
    });

    it('duplicate bar preserves fractional size', () => {
      let app = freshApp();
      app = dispatch(app, { type: 'PLACE_PIECE', piece: makeBarre({ id: 'b1', sizeMultiplier: 0.25 }) });
      // Simulate duplicate: place a second barre with same multiplier
      app = dispatch(app, { type: 'PLACE_PIECE', piece: makeBarre({ id: 'b2', sizeMultiplier: 0.25, y: 120 }) });
      const bars = currentModel(app).pieces.filter(p => p.type === 'barre') as Barre[];
      expect(bars).toHaveLength(2);
      expect(bars[0].sizeMultiplier).toBe(0.25);
      expect(bars[1].sizeMultiplier).toBe(0.25);
    });
  });

  // === Tableau piece ===

  describe('Tableau piece', () => {
    function makeTableau(overrides: Partial<Tableau> = {}): Tableau {
      return {
        id: 't1', type: 'tableau', x: 100, y: 100, locked: false,
        rows: 3, cols: 2,
        cells: [['En-tête 1', 'En-tête 2'], ['A', 'B'], ['C', 'D']],
        headerRow: true,
        ...overrides,
      };
    }

    it('places a tableau', () => {
      let app = freshApp();
      app = dispatch(app, { type: 'PLACE_PIECE', piece: makeTableau() });
      expect(currentModel(app).pieces).toHaveLength(1);
      const t = currentModel(app).pieces[0] as Tableau;
      expect(t.type).toBe('tableau');
      expect(t.rows).toBe(3);
      expect(t.cols).toBe(2);
      expect(t.cells).toHaveLength(3);
      expect(t.headerRow).toBe(true);
    });

    it('edits tableau cells', () => {
      let app = freshApp();
      app = dispatch(app, { type: 'PLACE_PIECE', piece: makeTableau() });
      const newCells = [['X', 'Y'], ['1', '2'], ['3', '4']];
      app = dispatch(app, { type: 'EDIT_PIECE', id: 't1', changes: { cells: newCells } });
      const t = currentModel(app).pieces[0] as Tableau;
      expect(t.cells[0][0]).toBe('X');
      expect(t.cells[2][1]).toBe('4');
    });

    it('edits tableau dimensions', () => {
      let app = freshApp();
      app = dispatch(app, { type: 'PLACE_PIECE', piece: makeTableau() });
      app = dispatch(app, { type: 'EDIT_PIECE', id: 't1', changes: {
        rows: 4, cols: 3,
        cells: [['A', 'B', 'C'], ['1', '2', '3'], ['4', '5', '6'], ['7', '8', '9']],
      } });
      const t = currentModel(app).pieces[0] as Tableau;
      expect(t.rows).toBe(4);
      expect(t.cols).toBe(3);
      expect(t.cells).toHaveLength(4);
      expect(t.cells[0]).toHaveLength(3);
    });

    it('moves a tableau', () => {
      let app = freshApp();
      app = dispatch(app, { type: 'PLACE_PIECE', piece: makeTableau() });
      app = dispatch(app, { type: 'MOVE_PIECE', id: 't1', x: 200, y: 300 });
      const t = currentModel(app).pieces[0] as Tableau;
      expect(t.x).toBe(200);
      expect(t.y).toBe(300);
    });

    it('deletes tableau and cascades to attached étiquettes', () => {
      let app = freshApp();
      app = dispatch(app, { type: 'PLACE_PIECE', piece: makeTableau({ id: 't1' }) });
      app = dispatch(app, { type: 'PLACE_PIECE', piece: makeEtiquette({ id: 'e1', attachedTo: 't1' }) });
      expect(currentModel(app).pieces).toHaveLength(2);

      app = dispatch(app, { type: 'DELETE_PIECE', id: 't1' });
      expect(currentModel(app).pieces).toHaveLength(0);
    });

    it('undo restores deleted tableau', () => {
      let app = freshApp();
      app = dispatch(app, { type: 'PLACE_PIECE', piece: makeTableau() });
      app = dispatch(app, { type: 'DELETE_PIECE', id: 't1' });
      expect(currentModel(app).pieces).toHaveLength(0);

      app = dispatch(app, { type: 'UNDO' });
      expect(currentModel(app).pieces).toHaveLength(1);
      expect((currentModel(app).pieces[0] as Tableau).type).toBe('tableau');
    });
  });

  // === Arbre & Schema ===

  describe('Arbre', () => {
    function makeArbre(overrides: Partial<Arbre> = {}): Arbre {
      return { id: 'a1', type: 'arbre', x: 100, y: 100, locked: false,
        levels: [{ name: 'N1', options: ['A', 'B'] }, { name: 'N2', options: ['X', 'Y'] }],
        ...overrides };
    }

    it('PLACE_PIECE places an arbre', () => {
      let app = freshApp();
      app = dispatch(app, { type: 'PLACE_PIECE', piece: makeArbre() });
      expect(currentModel(app).pieces).toHaveLength(1);
      expect((currentModel(app).pieces[0] as Arbre).type).toBe('arbre');
      expect((currentModel(app).pieces[0] as Arbre).levels).toHaveLength(2);
    });

    it('EDIT_PIECE can add a level', () => {
      let app = freshApp();
      const arbre = makeArbre();
      app = dispatch(app, { type: 'PLACE_PIECE', piece: arbre });
      app = dispatch(app, { type: 'EDIT_PIECE', id: arbre.id, changes: {
        levels: [...arbre.levels, { name: 'N3', options: ['1', '2', '3'] }],
      } });
      expect((currentModel(app).pieces[0] as Arbre).levels).toHaveLength(3);
    });

    it('DELETE_PIECE removes arbre and cascades etiquettes', () => {
      let app = freshApp();
      const arbre = makeArbre();
      const etiq = makeEtiquette({ id: 'e-arbre', attachedTo: arbre.id });
      app = dispatch(app, { type: 'PLACE_PIECE', piece: arbre });
      app = dispatch(app, { type: 'PLACE_PIECE', piece: etiq });
      expect(currentModel(app).pieces).toHaveLength(2);
      app = dispatch(app, { type: 'DELETE_PIECE', id: arbre.id });
      expect(currentModel(app).pieces).toHaveLength(0);
    });
  });

  describe('Schema', () => {
    function makeSchema(overrides: Partial<Schema> = {}): Schema {
      return { id: 's1', type: 'schema', x: 100, y: 100, locked: false,
        gabarit: 'parties-tout', totalLabel: '', totalValue: null,
        bars: [{ label: '', value: null, sizeMultiplier: 2, couleur: 'bleu', parts: [] }],
        referenceWidth: 120,
        ...overrides };
    }

    it('PLACE_PIECE places a schema', () => {
      let app = freshApp();
      app = dispatch(app, { type: 'PLACE_PIECE', piece: makeSchema() });
      expect(currentModel(app).pieces).toHaveLength(1);
      expect((currentModel(app).pieces[0] as Schema).gabarit).toBe('parties-tout');
    });

    it('EDIT_PIECE can change gabarit', () => {
      let app = freshApp();
      const schema = makeSchema();
      app = dispatch(app, { type: 'PLACE_PIECE', piece: schema });
      app = dispatch(app, { type: 'EDIT_PIECE', id: schema.id, changes: {
        gabarit: 'comparaison',
        bars: [
          { label: '', value: null, sizeMultiplier: 2, couleur: 'bleu', parts: [] },
          { label: '', value: null, sizeMultiplier: 1, couleur: 'rouge', parts: [] },
        ],
      } });
      expect((currentModel(app).pieces[0] as Schema).gabarit).toBe('comparaison');
      expect((currentModel(app).pieces[0] as Schema).bars).toHaveLength(2);
    });

    it('autoScaleReference includes schema bars', () => {
      let app = freshApp();
      // Place a schema with a very large sizeMultiplier that would overflow canvas
      const schema = makeSchema({
        bars: [{ label: '', value: null, sizeMultiplier: 10, couleur: 'bleu', parts: [] }],
      });
      app = dispatch(app, { type: 'PLACE_PIECE', piece: schema });
      // referenceUnitMm should be reduced from 60 to fit 10 * ref <= 470
      expect(currentModel(app).referenceUnitMm).toBeLessThan(REFERENCE_UNIT_MM);
    });
  });

  describe('Inconnue', () => {
    function makeInconnue(overrides: Partial<Inconnue> = {}): Inconnue {
      return { id: 'inc1', type: 'inconnue', x: 100, y: 100, locked: false, text: '?', attachedTo: null, ...overrides };
    }

    it('places an inconnue piece', () => {
      let app = createInitialAppState();
      app = dispatch(app, { type: 'PLACE_PIECE', piece: makeInconnue() });
      expect(currentModel(app).pieces).toHaveLength(1);
      expect(currentModel(app).pieces[0].type).toBe('inconnue');
    });

    it('inconnue follows parent on MOVE_PIECE', () => {
      let app = createInitialAppState();
      const barre = makeBarre({ id: 'b1' });
      const inc = makeInconnue({ id: 'inc1', attachedTo: 'b1', x: 110, y: 110 });
      app = dispatch(app, { type: 'PLACE_PIECE', piece: barre });
      app = dispatch(app, { type: 'PLACE_PIECE', piece: inc });
      app = dispatch(app, { type: 'MOVE_PIECE', id: 'b1', x: 200, y: 200 });
      const movedInc = currentModel(app).pieces.find(p => p.id === 'inc1')!;
      expect(movedInc.x).toBe(210); // 110 + (200-100)
      expect(movedInc.y).toBe(210);
    });

    it('deleting parent cascades to attached inconnue', () => {
      let app = createInitialAppState();
      const barre = makeBarre({ id: 'b1' });
      const inc = makeInconnue({ id: 'inc1', attachedTo: 'b1' });
      app = dispatch(app, { type: 'PLACE_PIECE', piece: barre });
      app = dispatch(app, { type: 'PLACE_PIECE', piece: inc });
      app = dispatch(app, { type: 'DELETE_PIECE', id: 'b1' });
      expect(currentModel(app).pieces).toHaveLength(0);
    });

    it('detaches inconnue when moved far from parent', () => {
      let app = createInitialAppState();
      const barre = makeBarre({ id: 'b1', x: 100, y: 100 });
      const inc = makeInconnue({ id: 'inc1', attachedTo: 'b1', x: 105, y: 105 });
      app = dispatch(app, { type: 'PLACE_PIECE', piece: barre });
      app = dispatch(app, { type: 'PLACE_PIECE', piece: inc });
      app = dispatch(app, { type: 'MOVE_PIECE', id: 'inc1', x: 300, y: 300 });
      const movedInc = currentModel(app).pieces.find(p => p.id === 'inc1') as Inconnue;
      expect(movedInc.attachedTo).toBeNull();
    });
  });

  describe('DiagrammeBandes', () => {
    function makeDiagrammeBandes(overrides: Partial<DiagrammeBandes> = {}): DiagrammeBandes {
      return {
        id: 'db1', type: 'diagrammeBandes', x: 50, y: 50, locked: false,
        title: '', yAxisLabel: '', width: 120, height: 90,
        categories: [
          { label: 'A', value: 3, couleur: 'bleu' },
          { label: 'B', value: 5, couleur: 'rouge' },
        ],
        ...overrides,
      };
    }

    it('places a diagrammeBandes piece', () => {
      let app = createInitialAppState();
      app = dispatch(app, { type: 'PLACE_PIECE', piece: makeDiagrammeBandes() });
      expect(currentModel(app).pieces).toHaveLength(1);
      expect(currentModel(app).pieces[0].type).toBe('diagrammeBandes');
    });

    it('edits categories', () => {
      let app = createInitialAppState();
      app = dispatch(app, { type: 'PLACE_PIECE', piece: makeDiagrammeBandes() });
      app = dispatch(app, { type: 'EDIT_PIECE', id: 'db1', changes: {
        categories: [{ label: 'X', value: 10, couleur: 'vert' }],
      }});
      const db = currentModel(app).pieces[0] as DiagrammeBandes;
      expect(db.categories).toHaveLength(1);
      expect(db.categories[0].label).toBe('X');
    });
  });

  describe('DiagrammeLigne', () => {
    function makeDiagrammeLigne(overrides: Partial<DiagrammeLigne> = {}): DiagrammeLigne {
      return {
        id: 'dl1', type: 'diagrammeLigne', x: 50, y: 50, locked: false,
        title: '', yAxisLabel: '', width: 120, height: 90,
        points: [
          { label: 'Lundi', value: 3 },
          { label: 'Mardi', value: 5 },
        ],
        ...overrides,
      };
    }

    it('places a diagrammeLigne piece', () => {
      let app = createInitialAppState();
      app = dispatch(app, { type: 'PLACE_PIECE', piece: makeDiagrammeLigne() });
      expect(currentModel(app).pieces).toHaveLength(1);
      expect(currentModel(app).pieces[0].type).toBe('diagrammeLigne');
    });

    it('edits points', () => {
      let app = createInitialAppState();
      app = dispatch(app, { type: 'PLACE_PIECE', piece: makeDiagrammeLigne() });
      app = dispatch(app, { type: 'EDIT_PIECE', id: 'dl1', changes: {
        points: [{ label: 'Jeudi', value: 8 }],
      }});
      const dl = currentModel(app).pieces[0] as DiagrammeLigne;
      expect(dl.points).toHaveLength(1);
      expect(dl.points[0].value).toBe(8);
    });
  });
});
