import { useLayoutEffect, useRef, type ReactNode } from 'react';

export function ScenePanel({ className, label, onClose, children }: { className: string; label: string; onClose: () => void; children: ReactNode }) {
  const dialog = useRef<HTMLDialogElement>(null);
  useLayoutEffect(() => {
    const opener = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    const element = dialog.current!;
    element.showModal();
    return () => { element.close(); if (opener?.isConnected) opener.focus(); };
  }, []);
  return <dialog ref={dialog} className={className} aria-label={label} onCancel={event => { event.preventDefault(); onClose(); }}>{children}</dialog>;
}
