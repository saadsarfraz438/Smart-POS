import type { ReactNode } from 'react';

export default function Modal({ title, children, onClose }: { title: string; children: ReactNode; onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-black/70 p-4" onClick={onClose}>
      <div role="dialog" aria-modal="true" aria-label={title} onClick={(e) => e.stopPropagation()}
        className="w-full max-w-sm rounded-2xl border border-line bg-card p-6 text-ink">
        <h2 className="mb-2 text-xl font-bold">{title}</h2>
        <div className="mb-5 text-mute">{children}</div>
        <button type="button" onClick={onClose} className="v-btn !min-h-[48px] !text-base">Close</button>
      </div>
    </div>
  );
}
