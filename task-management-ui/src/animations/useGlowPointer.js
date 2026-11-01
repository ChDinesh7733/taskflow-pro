/**
 * useGlowPointer — tracks pointer position for CSS-variable-based glow effects.
 * Attaches to a ref element and writes --glow-x / --glow-y as percentages.
 * Returns { ref } to attach to the target element.
 */
import { useRef, useEffect, useCallback } from 'react';

const isTouchDevice = () =>
  typeof window !== 'undefined' &&
  ('ontouchstart' in window || navigator.maxTouchPoints > 0);

export function useGlowPointer({ disabled = false } = {}) {
  const ref = useRef(null);

  const onMove = useCallback((e) => {
    const el = ref.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * 100;
    const y = ((e.clientY - rect.top) / rect.height) * 100;
    el.style.setProperty('--glow-x', `${x}%`);
    el.style.setProperty('--glow-y', `${y}%`);
  }, []);

  const onLeave = useCallback(() => {
    const el = ref.current;
    if (!el) return;
    el.style.setProperty('--glow-x', `50%`);
    el.style.setProperty('--glow-y', `50%`);
  }, []);

  useEffect(() => {
    if (disabled || isTouchDevice()) return;
    const el = ref.current;
    if (!el) return;
    el.addEventListener('mousemove', onMove, { passive: true });
    el.addEventListener('mouseleave', onLeave, { passive: true });
    return () => {
      el.removeEventListener('mousemove', onMove);
      el.removeEventListener('mouseleave', onLeave);
    };
  }, [disabled, onMove, onLeave]);

  return ref;
}

/**
 * usePageGlow — global ambient glow that follows the cursor across the whole page.
 * Writes --cursor-x / --cursor-y on document.documentElement.
 */
export function usePageGlow() {
  useEffect(() => {
    if (isTouchDevice()) return;

    let raf;
    let targetX = 0, targetY = 0;
    let currentX = 0, currentY = 0;

    const onMove = (e) => {
      targetX = (e.clientX / window.innerWidth) * 100;
      targetY = (e.clientY / window.innerHeight) * 100;
    };

    const tick = () => {
      currentX += (targetX - currentX) * 0.08;
      currentY += (targetY - currentY) * 0.08;
      document.documentElement.style.setProperty('--cursor-x', `${currentX}%`);
      document.documentElement.style.setProperty('--cursor-y', `${currentY}%`);
      raf = requestAnimationFrame(tick);
    };

    window.addEventListener('mousemove', onMove, { passive: true });
    raf = requestAnimationFrame(tick);

    return () => {
      window.removeEventListener('mousemove', onMove);
      cancelAnimationFrame(raf);
    };
  }, []);
}
