'use client';

import { useCallback, useEffect, useState } from 'react';

export function useHashModal(hash: string) {
  const [isOpen, setIsOpen] = useState(false);

  const syncFromLocation = useCallback(() => {
    setIsOpen(window.location.hash === hash);
  }, [hash]);

  const closeModal = useCallback(() => {
    if (window.location.hash === hash) {
      const url = `${window.location.pathname}${window.location.search}`;
      window.history.replaceState(window.history.state, '', url);
    }
    setIsOpen(false);
  }, [hash]);

  useEffect(() => {
    syncFromLocation();
    window.addEventListener('hashchange', syncFromLocation);
    window.addEventListener('popstate', syncFromLocation);
    return () => {
      window.removeEventListener('hashchange', syncFromLocation);
      window.removeEventListener('popstate', syncFromLocation);
    };
  }, [syncFromLocation]);

  useEffect(() => {
    if (!isOpen) return;

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') closeModal();
    };

    document.body.style.overflow = 'hidden';
    window.addEventListener('keydown', onKeyDown);
    return () => {
      document.body.style.overflow = '';
      window.removeEventListener('keydown', onKeyDown);
    };
  }, [isOpen, closeModal]);

  return { isOpen, closeModal };
}
