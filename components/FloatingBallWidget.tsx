import React, { useState, useRef, useCallback, useEffect } from 'react';
import { useLocalization } from '../contexts/LocalizationContext';

const BALL_SIZE = 52;
const STORAGE_KEY = 'algebrain_floating_ball_pos';

interface FloatingBallWidgetProps {
  onNavigateToScan: () => void;
  onNavigateToChat: () => void;
  onClose?: () => void;
}

export const FloatingBallWidget: React.FC<FloatingBallWidgetProps> = ({
  onNavigateToScan,
  onNavigateToChat,
  onClose,
}) => {
  const { t } = useLocalization();
  const [position, setPosition] = useState<{ x: number; y: number }>(() => {
    try {
      const s = localStorage.getItem(STORAGE_KEY);
      if (s) {
        const p = JSON.parse(s);
        if (typeof p?.x === 'number' && typeof p?.y === 'number') return p;
      }
    } catch {}
    return { x: typeof window !== 'undefined' ? window.innerWidth - BALL_SIZE - 16 : 200, y: 120 };
  });
  const [showMenu, setShowMenu] = useState(false);
  const dragStart = useRef<{ x: number; y: number; startX: number; startY: number } | null>(null);
  const lastTap = useRef(0);
  const longPressTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const persistPosition = useCallback((p: { x: number; y: number }) => {
    setPosition(p);
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(p));
    } catch {}
  }, []);

  const clamp = useCallback((x: number, y: number) => {
    const margin = 8;
    const maxX = typeof window !== 'undefined' ? window.innerWidth - BALL_SIZE - margin : 400;
    const maxY = typeof window !== 'undefined' ? window.innerHeight - BALL_SIZE - margin : 600;
    return {
      x: Math.max(margin, Math.min(maxX, x)),
      y: Math.max(margin, Math.min(maxY, y)),
    };
  }, []);

  const handlePointerDown = useCallback(
    (e: React.PointerEvent) => {
      e.preventDefault();
      (e.target as HTMLElement).setPointerCapture?.(e.pointerId);
      dragStart.current = { x: e.clientX, y: e.clientY, startX: position.x, startY: position.y };
      longPressTimer.current = setTimeout(() => {
        longPressTimer.current = null;
        setShowMenu(false);
        onClose?.();
      }, 800);
    },
    [position.x, position.y, onClose]
  );

  const handlePointerMove = useCallback(
    (e: React.PointerEvent) => {
      if (longPressTimer.current) {
        clearTimeout(longPressTimer.current);
        longPressTimer.current = null;
      }
      if (!dragStart.current) return;
      const dx = e.clientX - dragStart.current.x;
      const dy = e.clientY - dragStart.current.y;
      const next = clamp(dragStart.current.startX + dx, dragStart.current.startY + dy);
      persistPosition(next);
    },
    [clamp, persistPosition]
  );

  const handlePointerUp = useCallback(
    (e: React.PointerEvent) => {
      (e.target as HTMLElement).releasePointerCapture?.(e.pointerId);
      if (longPressTimer.current) {
        clearTimeout(longPressTimer.current);
        longPressTimer.current = null;
      }
      if (!dragStart.current) return;
      const dx = Math.abs(e.clientX - dragStart.current.x);
      const dy = Math.abs(e.clientY - dragStart.current.y);
      const moved = dx > 4 || dy > 4;
      dragStart.current = null;
      if (moved) return;
      const now = Date.now();
      if (now - lastTap.current < 350) {
        lastTap.current = 0;
        setShowMenu(false);
        onNavigateToScan();
        return;
      }
      lastTap.current = now;
      setShowMenu((prev) => !prev);
    },
    [onNavigateToScan]
  );

  useEffect(() => () => {
    if (longPressTimer.current) clearTimeout(longPressTimer.current);
  }, []);

  return (
    <>
      <div
        role="button"
        tabIndex={0}
        aria-label="Floating ball menu"
        className="fixed z-[200] rounded-full cursor-grab active:cursor-grabbing touch-none select-none flex items-center justify-center shadow-lg border-2 border-white/20"
        style={{
          width: BALL_SIZE,
          height: BALL_SIZE,
          left: position.x,
          top: position.y,
          background: 'linear-gradient(135deg, rgba(91, 140, 255, 0.95), rgba(167, 139, 250, 0.9))',
          boxShadow: '0 4px 20px rgba(91, 140, 255, 0.4), 0 0 0 1px rgba(255,255,255,0.1) inset',
        }}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerCancel={handlePointerUp}
      >
        <svg className="w-6 h-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
        </svg>
      </div>

      {showMenu && (
        <>
          <div
            className="fixed inset-0 z-[199] bg-black/40 backdrop-blur-sm"
            aria-hidden
            onClick={() => setShowMenu(false)}
          />
          <div
            className="fixed z-[201] rounded-2xl border border-white/10 overflow-hidden shadow-xl min-w-[52px]"
            style={{
              left: Math.max(12, Math.min(position.x, (typeof window !== 'undefined' ? window.innerWidth : 400) - 64)),
              top: position.y + BALL_SIZE + 8,
              background: 'rgba(15, 18, 30, 0.95)',
              backdropFilter: 'blur(16px)',
            }}
          >
            <button
              type="button"
              aria-label={t('floatingBall.scanAndSolve')}
              className="w-full p-3 text-white hover:bg-white/10 flex items-center justify-center"
              onClick={() => { setShowMenu(false); onNavigateToScan(); }}
            >
              <span className="text-xl">📷</span>
            </button>
            <button
              type="button"
              aria-label={t('floatingBall.askTutor')}
              className="w-full p-3 text-white hover:bg-white/10 flex items-center justify-center border-t border-white/5"
              onClick={() => { setShowMenu(false); onNavigateToChat(); }}
            >
              <span className="text-xl">💬</span>
            </button>
            <button
              type="button"
              aria-label={t('floatingBall.close')}
              className="w-full p-3 text-white/60 hover:bg-white/5 flex items-center justify-center border-t border-white/5"
              onClick={() => { setShowMenu(false); onClose?.(); }}
            >
              <span className="text-lg" aria-hidden>✕</span>
            </button>
          </div>
        </>
      )}
    </>
  );
};

export default FloatingBallWidget;
