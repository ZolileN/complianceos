'use client';

import React, { createContext, useContext, useState, useRef } from 'react';

interface ConfirmOptions {
  title?: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  type?: 'danger' | 'warning' | 'info';
}

interface ConfirmContextValue {
  confirm: (options: ConfirmOptions | string) => Promise<boolean>;
}

const ConfirmContext = createContext<ConfirmContextValue>({
  confirm: () => Promise.resolve(false),
});

export function ConfirmProvider({ children }: { children: React.ReactNode }) {
  const [isOpen, setIsOpen] = useState(false);
  const [options, setOptions] = useState<ConfirmOptions>({ message: '' });
  const resolverRef = useRef<((value: boolean) => void) | null>(null);

  const confirm = (opts: ConfirmOptions | string) => {
    const parsedOptions = typeof opts === 'string' ? { message: opts } : opts;
    setOptions({
      title: parsedOptions.title || 'Confirm Action',
      message: parsedOptions.message,
      confirmText: parsedOptions.confirmText || 'Confirm',
      cancelText: parsedOptions.cancelText || 'Cancel',
      type: parsedOptions.type || 'danger',
    });
    setIsOpen(true);
    return new Promise<boolean>((resolve) => {
      resolverRef.current = resolve;
    });
  };

  const handleClose = (value: boolean) => {
    setIsOpen(false);
    if (resolverRef.current) {
      resolverRef.current(value);
      resolverRef.current = null;
    }
  };

  return (
    <ConfirmContext.Provider value={{ confirm }}>
      {children}
      {isOpen && (
        <div className="modal-overlay" style={{ zIndex: 10000 }} onClick={() => handleClose(false)}>
          <div className="modal" style={{ maxWidth: 400, width: '90%' }} onClick={(e) => e.stopPropagation()}>
            <div className="modal-header" style={{ padding: '20px 20px 0' }}>
              <h2 className="modal-title" style={{ fontSize: '1.1rem', fontWeight: 700 }}>{options.title}</h2>
            </div>
            <div className="modal-body" style={{ padding: '20px', color: 'var(--text-secondary)', fontSize: '0.9rem', lineHeight: '1.5' }}>
              {options.message}
            </div>
            <div className="modal-footer" style={{ padding: '0 20px 20px', gap: 10, display: 'flex', justifyContent: 'flex-end' }}>
              <button className="btn btn-ghost btn-sm" onClick={() => handleClose(false)}>
                {options.cancelText}
              </button>
              <button 
                className={`btn btn-sm ${options.type === 'danger' ? 'btn-danger' : 'btn-primary'}`} 
                onClick={() => handleClose(true)}
              >
                {options.confirmText}
              </button>
            </div>
          </div>
        </div>
      )}
    </ConfirmContext.Provider>
  );
}

export const useConfirm = () => useContext(ConfirmContext);
