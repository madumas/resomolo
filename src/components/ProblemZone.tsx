import { useState, useEffect, useMemo, useCallback } from 'react';
import type { Highlight, HighlightColor, Piece } from '../model/types';
import { UI_PRIMARY, UI_BORDER, UI_TEXT_PRIMARY, UI_TEXT_SECONDARY } from '../config/theme';
import { SpeakerIcon, StopCircleIcon } from './ToolIcons';
import { SharePanel } from './SharePanel';

interface ProblemZoneProps {
  text: string;
  highlights: Highlight[];
  pieces: Piece[];
  expanded: boolean;
  readOnly: boolean;
  onToggle: () => void;
  onHighlightAdd: (highlight: Highlight) => void;
  onHighlightRemove: (start: number, end: number) => void;
  onTextChange?: (text: string) => void;
  ttsEnabled?: boolean;
  ttsRate?: number;
  onTTSCharIndex?: number;
  onStartTTS?: () => void;
  onStopTTS?: () => void;
  isTTSSpeaking?: boolean;
  guidedReadingEnabled?: boolean;
}

interface Token {
  word: string;
  start: number;
  end: number;
  trailingSpace: string;
}

const HIGHLIGHT_COLORS: Record<HighlightColor, { bg: string; border: string }> = {
  bleu: { bg: '#C5D9F0', border: UI_PRIMARY },
  orange: { bg: '#F5D5C0', border: '#C24B22' },
  vert: { bg: '#C5E8D5', border: '#0B7285' },
  gris: { bg: '#E5E7EB', border: '#6B7280' },
};

const PASTILLE_ORDER: HighlightColor[] = ['bleu', 'orange', 'vert', 'gris'];

export function ProblemZone({
  text,
  highlights,
  pieces,
  expanded,
  readOnly: _readOnly,
  onToggle,
  onHighlightAdd,
  onHighlightRemove,
  onTextChange,
  ttsEnabled,
  ttsRate: _ttsRate,
  onTTSCharIndex,
  onStartTTS,
  onStopTTS,
  isTTSSpeaking,
  guidedReadingEnabled,
}: ProblemZoneProps) {
  const [activeColor, setActiveColor] = useState<HighlightColor>('bleu');
  // showSharePanel removed — sharing is in ActionBar
  const [isEditing, setIsEditing] = useState(false);
  const [editText, setEditText] = useState(text);
  useEffect(() => { setEditText(text); }, [text]);

  // Guided reading state
  const [currentSentenceIndex, setCurrentSentenceIndex] = useState(0);
  useEffect(() => { setCurrentSentenceIndex(0); }, [text]);

  const sentences = useMemo(() => {
    if (!text) return [];
    // Split on sentence-ending punctuation followed by space or end
    return text.split(/(?<=[.?!])\s+/).filter(s => s.trim().length > 0);
  }, [text]);

  const tokens = useMemo(() => tokenize(text), [text]);

  const handleWordClick = useCallback((token: Token) => {
    // Check if this word is already highlighted
    const existingIdx = highlights.findIndex(
      h => h.start <= token.start && h.end >= token.end
    );

    if (existingIdx >= 0) {
      // Toggle off
      const h = highlights[existingIdx];
      onHighlightRemove(h.start, h.end);
      return;
    }

    // Check for adjacent highlight of same color to extend
    const adjacent = highlights.find(h =>
      h.color === activeColor && (
        // token is right after highlight
        (token.start <= h.end + 2 && token.start >= h.end - 1) ||
        // token is right before highlight
        (token.end >= h.start - 2 && token.end <= h.start + 1)
      )
    );

    if (adjacent) {
      // Extend: remove old, add expanded
      onHighlightRemove(adjacent.start, adjacent.end);
      onHighlightAdd({
        start: Math.min(adjacent.start, token.start),
        end: Math.max(adjacent.end, token.end),
        color: activeColor,
      });
    } else {
      // New highlight
      onHighlightAdd({
        start: token.start,
        end: token.end,
        color: activeColor,
      });
    }
  }, [highlights, activeColor, onHighlightAdd, onHighlightRemove]);

  if (!text && !isEditing) {
    // No problem text — show edit option or nothing
    if (onTextChange) {
      return (
        <div style={{
          padding: '8px 16px',
          background: '#F2F0F8',
          borderBottom: '1px solid #E8E5F0',
          flexShrink: 0,
        }}>
          <button
            onClick={() => setIsEditing(true)}
            style={{
              background: 'none', border: '1px dashed #D5D0E0', borderRadius: 6,
              padding: '6px 12px', fontSize: 13, color: UI_TEXT_SECONDARY, cursor: 'pointer',
              width: '100%', textAlign: 'left',
            }}
          >
            Taper ou coller un problème...
          </button>
        </div>
      );
    }
    return null;
  }

  // Editing mode (textarea)
  if (isEditing && onTextChange) {
    return (
      <div data-testid="problem-zone" style={{
        padding: '12px 16px',
        background: '#F2F0F8',
        borderBottom: '1px solid #E8E5F0',
        flexShrink: 0,
      }}>
        <textarea
          autoFocus
          value={editText}
          onChange={e => setEditText(e.target.value)}
          onKeyDown={e => {
            if (e.key === 'Enter' && !e.shiftKey) {
              e.preventDefault();
              onTextChange(editText);
              setIsEditing(false);
            }
            if (e.key === 'Escape') {
              setEditText(text);
              setIsEditing(false);
            }
          }}
          onBlur={() => {
            onTextChange(editText);
            setIsEditing(false);
          }}
          style={{
            width: '100%', minHeight: 60, border: '1px solid #D5D0E0',
            borderRadius: 6, padding: 8, fontSize: 14, resize: 'vertical',
            fontFamily: 'inherit',
          }}
        />
        <div style={{ fontSize: 11, color: '#9CA3AF', marginTop: 4 }}>
          Entrée pour valider, Escape pour annuler
        </div>
      </div>
    );
  }

  // Compact mode
  if (!expanded) {
    const blueHighlights = highlights.filter(h => h.color === 'bleu');
    const highlightedTexts = blueHighlights.map(h => text.slice(h.start, h.end));

    return (
      <div
        data-testid="problem-zone"
        onClick={onToggle}
        style={{
          padding: '8px 16px',
          background: '#F2F0F8',
          borderBottom: '1px solid #E8E5F0',
          fontSize: 13,
          flexShrink: 0,
          cursor: 'pointer',
          display: 'flex',
          gap: 8,
          alignItems: 'center',
          overflow: 'hidden',
        }}
      >
        <span style={{ color: UI_TEXT_SECONDARY, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', flex: 1 }}>
          ▶ {text.length > 60 ? text.slice(0, 60) + '...' : text}
        </span>
        {highlightedTexts.length > 0 && (
          <span style={{ display: 'flex', gap: 4, flexShrink: 0 }}>
            {highlightedTexts.map((t, i) => (
              <span key={i} style={{
                background: '#C5D9F0', borderRadius: 3,
                padding: '1px 6px', fontSize: 12, color: UI_PRIMARY, fontWeight: 500,
              }}>
                {t}
              </span>
            ))}
          </span>
        )}
      </div>
    );
  }

  // Expanded mode with word-by-word highlighting
  return (
    <div data-testid="problem-zone" style={{
      padding: '12px 16px',
      background: '#F2F0F8',
      borderBottom: '1px solid #E8E5F0',
      flexShrink: 0,
      position: 'relative',
    }}>
      <div style={{
        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        marginBottom: 6,
      }}>
        <span
          onClick={onToggle}
          style={{ fontSize: 11, color: UI_TEXT_SECONDARY, textTransform: 'uppercase', letterSpacing: 0.5, cursor: 'pointer' }}
        >
          ▼ Problème
        </span>
        <div style={{ display: 'flex', gap: 6 }}>
          {PASTILLE_ORDER.map(color => {
            const label = color === 'bleu' ? 'Données' : color === 'orange' ? 'Question' : color === 'vert' ? 'Contexte' : 'Superflu';
            return (
              <button
                key={color}
                onClick={() => setActiveColor(color)}
                style={{
                  width: 44, height: 44, borderRadius: '50%',
                  background: HIGHLIGHT_COLORS[color].bg,
                  border: `2px solid ${activeColor === color ? HIGHLIGHT_COLORS[color].border : 'transparent'}`,
                  boxShadow: activeColor === color ? `0 0 0 3px ${HIGHLIGHT_COLORS[color].bg}` : 'none',
                  cursor: 'pointer',
                  transition: 'box-shadow 0.2s',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: 9, fontWeight: 600, color: HIGHLIGHT_COLORS[color].border,
                  lineHeight: 1,
                }}
                title={label}
                aria-label={`Surligner: ${label}`}
              >
                {label}
              </button>
            );
          })}
          {/* Bouton TTS — lecture à voix haute */}
          {ttsEnabled && text && (
            <>
              <div style={{ width: 1, height: 28, background: UI_BORDER, margin: '0 2px' }} />
              <button
                onClick={isTTSSpeaking ? onStopTTS : onStartTTS}
                title={isTTSSpeaking ? 'Arrêter la lecture' : 'Lire à voix haute'}
                aria-label={isTTSSpeaking ? 'Arrêter la lecture' : 'Lire à voix haute'}
                style={{
                  minWidth: 44, minHeight: 44,
                  background: isTTSSpeaking ? '#FEF3C7' : 'none',
                  border: `1px solid ${isTTSSpeaking ? '#F59E0B' : UI_BORDER}`,
                  borderRadius: 6,
                  cursor: 'pointer',
                  color: isTTSSpeaking ? '#9060C0' : UI_TEXT_SECONDARY,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}
              >
                {isTTSSpeaking ? <StopCircleIcon /> : <SpeakerIcon />}
              </button>
            </>
          )}
          {/* Partager déplacé dans l'ActionBar */}
        </div>
      </div>

      {/* SharePanel removed — sharing is handled by ActionBar */}
      {false && (
        <SharePanel
          problemText={text}
          pieces={pieces}
          onClose={() => {}}
        />
      )}

      {guidedReadingEnabled && sentences.length > 1 && currentSentenceIndex < sentences.length ? (
        <>
          {/* Current sentence with highlighting */}
          <div style={{ fontSize: 14, lineHeight: 1.8, color: UI_TEXT_PRIMARY, marginBottom: 8 }}>
            {(() => {
              const sentence = sentences[currentSentenceIndex];
              const sentenceStart = text.indexOf(sentence);
              return tokenize(sentence).map((token, i) => {
                const adjustedToken = { ...token, start: token.start + sentenceStart, end: token.end + sentenceStart };
                const highlight = highlights.find(h => h.start <= adjustedToken.start && h.end >= adjustedToken.end);
                const isBeingSpoken = onTTSCharIndex !== undefined && onTTSCharIndex >= 0
                  && adjustedToken.start <= onTTSCharIndex && adjustedToken.end > onTTSCharIndex;
                return (
                  <span key={i}>
                    <span onClick={() => handleWordClick(adjustedToken)} style={{
                      cursor: 'pointer',
                      background: isBeingSpoken ? '#FEF3C7' : (highlight ? HIGHLIGHT_COLORS[highlight.color].bg : 'transparent'),
                      borderRadius: (highlight || isBeingSpoken) ? 3 : 0,
                      padding: (highlight || isBeingSpoken) ? '1px 2px' : 0,
                      textDecoration: highlight?.color === 'gris' ? 'line-through' : 'none',
                      opacity: highlight?.color === 'gris' ? 0.6 : 1,
                    }}>
                      {token.word}
                    </span>
                    {token.trailingSpace}
                  </span>
                );
              });
            })()}
          </div>
          {/* Navigation */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 4 }}>
            <button
              onClick={() => setCurrentSentenceIndex(i => Math.max(0, i - 1))}
              disabled={currentSentenceIndex === 0}
              style={{ minHeight: 44, minWidth: 44, padding: '4px 12px', fontSize: 12, borderRadius: 6,
                background: '#fff', border: '1px solid #D5D0E0', cursor: currentSentenceIndex === 0 ? 'default' : 'pointer',
                opacity: currentSentenceIndex === 0 ? 0.4 : 1, color: '#55506A' }}
            >
              {'\u2190'} Pr{'\u00e9'}c{'\u00e9'}dent
            </button>
            <span style={{ fontSize: 12, color: '#9CA3AF' }}>
              {currentSentenceIndex + 1} / {sentences.length}
            </span>
            <button
              onClick={() => setCurrentSentenceIndex(i => i + 1)}
              style={{ minHeight: 44, minWidth: 44, padding: '4px 12px', fontSize: 12, borderRadius: 6,
                background: UI_PRIMARY, border: 'none', color: '#fff', cursor: 'pointer', fontWeight: 600 }}
            >
              {currentSentenceIndex < sentences.length - 1 ? 'Suivant \u2192' : 'Voir tout'}
            </button>
          </div>
        </>
      ) : (
        /* Normal token-based rendering */
        <div style={{ fontSize: 14, lineHeight: 1.8, color: UI_TEXT_PRIMARY }}>
          {tokens.map((token, i) => {
            const highlight = highlights.find(
              h => h.start <= token.start && h.end >= token.end
            );
            // Determine if this token is being spoken
            const isBeingSpoken = onTTSCharIndex !== undefined && onTTSCharIndex >= 0
              && token.start <= onTTSCharIndex && token.end > onTTSCharIndex;
            return (
              <span key={i}>
                <span
                  onClick={() => handleWordClick(token)}
                  style={{
                    cursor: 'pointer',
                    background: isBeingSpoken ? '#FEF3C7' : (highlight ? HIGHLIGHT_COLORS[highlight.color].bg : 'transparent'),
                    borderRadius: (highlight || isBeingSpoken) ? 3 : 0,
                    padding: (highlight || isBeingSpoken) ? '1px 2px' : 0,
                    textDecoration: highlight?.color === 'gris' ? 'line-through' : 'none',
                    opacity: highlight?.color === 'gris' ? 0.6 : 1,
                    transition: 'background 0.15s',
                  }}
                >
                  {token.word}
                </span>
                {token.trailingSpace}
              </span>
            );
          })}
        </div>
      )}
    </div>
  );
}

function tokenize(text: string): Token[] {
  const tokens: Token[] = [];
  const regex = /(\S+)(\s*)/g;
  let match;
  while ((match = regex.exec(text)) !== null) {
    tokens.push({
      word: match[1],
      start: match.index,
      end: match.index + match[1].length,
      trailingSpace: match[2],
    });
  }
  return tokens;
}
