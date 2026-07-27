'use client';

import { useCallback, useEffect, useSyncExternalStore } from 'react';

const HASH_EVENT = 'praxis-hash-modal-change';

function subscribeHash(callback: () => void) {
  window.addEventListener('hashchange', callback);
  window.addEventListener('popstate', callback);
  window.addEventListener(HASH_EVENT, callback);
  return () => {
    window.removeEventListener('hashchange', callback);
    window.removeEventListener('popstate', callback);
    window.removeEventListener(HASH_EVENT, callback);
  };
}

export function useHashModal(hash: string) {
  // External store: the URL hash is the source of truth (no setState-in-effect).
  const isOpen = useSyncExternalStore(
    subscribeHash,
    () => window.location.hash === hash,
    () => false
  );

  const closeModal = useCallback(() => {
    if (window.location.hash === hash) {
      const url = `${window.location.pathname}${window.location.search}`;
      window.history.replaceState(window.history.state, '', url);
      // replaceState fires no events — notify subscribers explicitly.
      window.dispatchEvent(new Event(HASH_EVENT));
    }
  }, [hash]);

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
