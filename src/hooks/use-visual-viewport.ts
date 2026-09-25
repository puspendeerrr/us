'use client';

import { useState, useEffect, useRef } from 'react';

export interface VisualViewportState {
  isKeyboardOpen: boolean;
  viewportHeight: number;
}

/**
 * Hook to track mobile visual viewport changes (e.g. when virtual keyboard opens/closes).
 * Sets CSS variable `--visual-viewport-height` and `data-keyboard-open` attribute.
 */
export function useVisualViewport(): VisualViewportState {
  const [state, setState] = useState<VisualViewportState>({
    isKeyboardOpen: false,
    viewportHeight: typeof window !== 'undefined' ? window.innerHeight : 0,
  });

  const initialHeightRef = useRef<number>(0);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    initialHeightRef.current = window.innerHeight;

    const handleViewportChange = () => {
      const vv = window.visualViewport;
      const currentHeight = vv ? vv.height : window.innerHeight;

      // In Android & mobile browsers, keyboard takes up 150px+ of vertical space
      const baseHeight = Math.max(initialHeightRef.current, window.innerHeight);
      const isKeyboard = baseHeight - currentHeight > 150;

      // Apply CSS custom property to document for zero-delay CSS styling
      document.documentElement.style.setProperty(
        '--visual-viewport-height',
        `${Math.round(currentHeight)}px`
      );

      if (isKeyboard) {
        document.documentElement.setAttribute('data-keyboard-open', 'true');
      } else {
        document.documentElement.removeAttribute('data-keyboard-open');
        // Update baseline height when keyboard is definitely closed
        initialHeightRef.current = window.innerHeight;
      }

      setState((prev) => {
        if (
          prev.isKeyboardOpen === isKeyboard &&
          Math.abs(prev.viewportHeight - currentHeight) < 2
        ) {
          return prev; // Prevent unnecessary React re-renders
        }
        return {
          isKeyboardOpen: isKeyboard,
          viewportHeight: currentHeight,
        };
      });
    };

    // Initial run
    handleViewportChange();

    const vv = window.visualViewport;
    if (vv) {
      vv.addEventListener('resize', handleViewportChange);
      vv.addEventListener('scroll', handleViewportChange);
    } else {
      window.addEventListener('resize', handleViewportChange);
    }

    return () => {
      if (vv) {
        vv.removeEventListener('resize', handleViewportChange);
        vv.removeEventListener('scroll', handleViewportChange);
      } else {
        window.removeEventListener('resize', handleViewportChange);
      }
      document.documentElement.style.removeProperty('--visual-viewport-height');
      document.documentElement.removeAttribute('data-keyboard-open');
    };
  }, []);

  return state;
}
