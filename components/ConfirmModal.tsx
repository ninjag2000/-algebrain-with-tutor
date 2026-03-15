import React, { useEffect } from 'react';

export interface ConfirmModalProps {
  open: boolean;
  title: string;
  message: string;
  confirmLabel: string;
  cancelLabel: string;
  onConfirm: () => void;
  onCancel: () => void;
  /** 'danger' for destructive actions (red accent), 'default' for neutral */
  variant?: 'danger' | 'default';
}

const ConfirmModal: React.FC<ConfirmModalProps> = ({
  open,
  title,
  message,
  confirmLabel,
  cancelLabel,
  onConfirm,
  onCancel,
  variant = 'default',
}) => {
  useEffect(() => {
    if (open) {
      const onKey = (e: KeyboardEvent) => {
        if (e.key === 'Escape') onCancel();
      };
      document.addEventListener('keydown', onKey);
      return () => document.removeEventListener('keydown', onKey);
    }
  }, [open, onCancel]);

  if (!open) return null;

  const confirmClass =
    variant === 'danger'
      ? 'bg-[#EF4444]/90 hover:bg-[#EF4444] text-white shadow-[0_0_20px_rgba(239,68,68,0.35)]'
      : 'bg-[#3A8DFF]/90 hover:bg-[#3A8DFF] text-white shadow-[0_0_20px_rgba(58,141,255,0.35)]';

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-[#0B0F1A]/60 backdrop-blur-sm transition-opacity duration-200"
      role="dialog"
      aria-modal="true"
      aria-labelledby="confirm-modal-title"
    >
      {/* Backdrop */}
      <button
        type="button"
        onClick={onCancel}
        className="absolute inset-0"
        aria-label={cancelLabel}
      />
      {/* Card */}
      <div
        className="relative w-full max-w-sm rounded-2xl border border-white/10 bg-[#121826]/95 backdrop-blur-xl p-6 shadow-[0_0_40px_rgba(58,141,255,0.12),0_0_0_1px_rgba(255,255,255,0.05)] transition-transform duration-200 scale-100"
      >
        <h2 id="confirm-modal-title" className="text-lg font-bold text-white mb-2">
          {title}
        </h2>
        <p className="text-[#9AA3B2] text-sm leading-relaxed mb-6">{message}</p>
        <div className="flex gap-3">
          <button
            type="button"
            onClick={onCancel}
            className="flex-1 py-3 px-4 rounded-xl font-semibold text-sm text-[#9AA3B2] bg-white/5 border border-white/10 hover:bg-white/10 transition-colors duration-200 active:scale-[0.98]"
          >
            {cancelLabel}
          </button>
          <button
            type="button"
            onClick={() => {
              onConfirm();
              onCancel();
            }}
            className={`flex-1 py-3 px-4 rounded-xl font-semibold text-sm transition-all duration-200 active:scale-[0.98] ${confirmClass}`}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
};

export default ConfirmModal;
