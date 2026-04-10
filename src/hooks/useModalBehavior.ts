import { useEffect, type RefObject } from 'react';

const FOCUSABLE = 'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

// Modal stack — only the topmost modal responds to Escape
interface ModalEntry {
  id: symbol;
  onClose: () => void;
  shouldClose?: () => boolean;
}

const modalStack: ModalEntry[] = [];
let globalHandlerRegistered = false;

function globalEscapeHandler(e: KeyboardEvent) {
  if (e.key !== 'Escape' || e.defaultPrevented || modalStack.length === 0) return;
  const top = modalStack[modalStack.length - 1];
  if (top.shouldClose && !top.shouldClose()) return;
  e.stopImmediatePropagation();
  top.onClose();
}

function ensureGlobalHandler() {
  if (!globalHandlerRegistered) {
    window.addEventListener('keydown', globalEscapeHandler, true);
    globalHandlerRegistered = true;
  }
}

/**
 * Hook providing modal dialog behavior: Escape to close, focus trap, and focus restore.
 *
 * @param dialogRef  Ref to the dialog container element (the inner panel, not the overlay)
 * @param onClose    Callback to close the dialog
 * @param options.initialFocusRef  Optional ref to the element that should receive initial focus
 * @param options.shouldCloseOnEscape  Optional guard — return false to prevent Escape from closing (e.g. during inline edits)
 */
export function useModalBehavior(
  dialogRef: RefObject<HTMLElement | null>,
  onClose: () => void,
  options?: {
    initialFocusRef?: RefObject<HTMLElement | null>;
    shouldCloseOnEscape?: () => boolean;
  },
): void {
  // Escape key — uses a module-level stack so only the topmost modal responds
  useEffect(() => {
    ensureGlobalHandler();
    const entry: ModalEntry = {
      id: Symbol(),
      onClose,
      shouldClose: options?.shouldCloseOnEscape,
    };
    modalStack.push(entry);
    return () => {
      const idx = modalStack.findIndex(e => e.id === entry.id);
      if (idx !== -1) modalStack.splice(idx, 1);
    };
  }, [onClose, options]);

  // Focus trap — cycle Tab within the dialog
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key !== 'Tab' || !dialogRef.current) return;
      const focusable = Array.from(dialogRef.current.querySelectorAll<HTMLElement>(FOCUSABLE));
      if (focusable.length === 0) return;
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (e.shiftKey) {
        if (document.activeElement === first) { e.preventDefault(); last.focus(); }
      } else {
        if (document.activeElement === last) { e.preventDefault(); first.focus(); }
      }
    };
    window.addEventListener('keydown', handler, true);
    return () => window.removeEventListener('keydown', handler, true);
  }, [dialogRef]);

  // Initial focus + restore on unmount
  useEffect(() => {
    const previouslyFocused = document.activeElement as HTMLElement | null;
    // Defer to allow React to finish rendering the dialog content
    const raf = requestAnimationFrame(() => {
      if (options?.initialFocusRef?.current) {
        options.initialFocusRef.current.focus();
      } else if (dialogRef.current) {
        const first = dialogRef.current.querySelector<HTMLElement>(FOCUSABLE);
        first?.focus();
      }
    });
    return () => {
      cancelAnimationFrame(raf);
      previouslyFocused?.focus();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
}
