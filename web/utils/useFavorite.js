'use client';

import { useCallback, useEffect, useState } from 'react';
import { FAVORITES_EVENT, readFavorites, toggleFavorite } from './favorites.js';
import { askToSave } from './savePrompt.js';
import { getSession } from './supabaseAuth.js';

// One saved/not-saved toggle — every heart and shelf button on the site.
//
// localStorage is unreadable during SSR, so the first render is always "not
// saved" and the real state is restored on mount, keeping server and client
// markup identical. It also follows later changes: the same item toggled
// elsewhere on the page, or the whole list replaced by the account's copy
// after sign-in.
//
// Saving needs an account: signed out, a tap that would save asks first
// (utils/savePrompt.js). Removing never asks.
export function useFavorite(storageKey, slug) {
  const favId = slug ? String(slug) : '';
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    if (!favId) return undefined;
    const refresh = () => setSaved(readFavorites(storageKey).map(String).includes(favId));
    refresh();
    const onChange = (event) => {
      if (event.detail?.key === storageKey) refresh();
    };
    window.addEventListener(FAVORITES_EVENT, onChange);
    return () => window.removeEventListener(FAVORITES_EVENT, onChange);
  }, [storageKey, favId]);

  const toggle = useCallback(async () => {
    if (!favId) return;
    const saving = !readFavorites(storageKey).map(String).includes(favId);
    if (saving) {
      const { data: session } = await getSession();
      if (!session) {
        askToSave(storageKey, favId);
        return;
      }
    }
    const next = toggleFavorite(storageKey, favId);
    if (next) setSaved(next.includes(favId));
  }, [storageKey, favId]);

  return [saved, toggle];
}
