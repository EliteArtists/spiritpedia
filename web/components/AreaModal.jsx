'use client';

import { useCallback, useEffect, useId, useRef, useState } from 'react';
import { supabase } from '../utils/supabase.js';
import { getSession } from '../utils/supabaseAuth.js';
import { placeLabel, readArea, roundForPrivacy, tidyPlace, writeArea } from '../utils/area.js';
import { saveAreaToAccount } from '../utils/areaSync.js';

// "Your area": Use my location, or Type my city — a town, never a position.
// Opened from Practitioners Near You ("Set your area" / "Change"). The app
// has the same two choices (app/lib/features/area/area_sheet.dart).
//
// "Use my location" asks the browser once, rounds what it gives to about 1 km,
// and asks the database for the nearest town (nearest_place, migration 0019),
// which stores nothing. Only the town is kept.

const PLACE_COLUMNS = 'id, name, region, country, lat, lng';

export default function AreaModal({ open, onClose }) {
  const titleId = useId();
  const cardRef = useRef(null);
  // Mounted fresh each time it opens (NearYouShelf), so it starts clean.
  const [current] = useState(() => readArea());
  const [typing, setTyping] = useState(false);
  const [query, setQuery] = useState('');
  const [results, setResults] = useState([]);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState(null);
  const [searching, setSearching] = useState(false);
  const debounceRef = useRef(null);
  const searchRef = useRef(0);

  useEffect(() => {
    if (!open) return undefined;
    cardRef.current?.focus();
    const previous = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const onKey = (e) => {
      if (e.key === 'Escape') onClose?.();
    };
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = previous;
    };
  }, [open, onClose]);

  const choose = useCallback(
    async (place) => {
      const tidy = tidyPlace(place);
      writeArea(tidy);
      const { data: session } = await getSession();
      if (session?.user?.id) {
        try {
          await saveAreaToAccount(session.user.id, tidy);
        } catch {
          // Kept in this browser; the next sign-in sends it.
        }
      }
      onClose?.();
    },
    [onClose]
  );

  const useLocation = () => {
    setMessage(null);
    if (!('geolocation' in navigator)) {
      setMessage('This browser can’t share a location. You can type your town instead.');
      return;
    }
    setBusy(true);
    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const { data } = await supabase.rpc('nearest_place', {
          p_lat: roundForPrivacy(position.coords.latitude),
          p_lng: roundForPrivacy(position.coords.longitude),
        });
        const id = Array.isArray(data) && data[0]?.id;
        if (!id) {
          setBusy(false);
          setMessage('No town found near you. You can type your town instead.');
          return;
        }
        const { data: rows } = await supabase.from('places').select(PLACE_COLUMNS).eq('id', id).limit(1);
        if (!rows?.[0]) {
          setBusy(false);
          setMessage('No town found near you. You can type your town instead.');
          return;
        }
        await choose(rows[0]);
      },
      () => {
        setBusy(false);
        setMessage('Spiritpedia can’t see your location. You can type your town instead.');
      },
      { enableHighAccuracy: false, maximumAge: 10 * 60 * 1000, timeout: 15000 }
    );
  };

  // As the app does: a moment's pause after typing, and no "no town" while
  // the answer is still on its way.
  const search = (value) => {
    setQuery(value);
    clearTimeout(debounceRef.current);
    // Letters, spaces, hyphens and apostrophes only: it goes into a pattern.
    const q = value.trim().replace(/[^\p{L}\s\-']/gu, '');
    const mine = ++searchRef.current;
    if (q.length < 2) {
      setResults([]);
      setSearching(false);
      return;
    }
    setSearching(true);
    debounceRef.current = setTimeout(async () => {
      const { data } = await supabase
        .from('places')
        .select(PLACE_COLUMNS)
        .or(`name.ilike."${q}*",ascii_name.ilike."${q}*"`)
        .order('population', { ascending: false })
        .limit(8);
      if (mine !== searchRef.current) return;
      setResults(data || []);
      setSearching(false);
    }, 250);
  };

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-[110] flex items-end justify-center bg-black/70 p-4 backdrop-blur-sm sm:items-center"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose?.();
      }}
    >
      <div
        ref={cardRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        tabIndex={-1}
        className="relative w-full max-w-md rounded-3xl border border-white/10 bg-[#111827] p-8 text-center shadow-2xl outline-none"
      >
        <button
          type="button"
          onClick={onClose}
          aria-label="Close"
          className="absolute right-4 top-4 flex h-9 w-9 items-center justify-center rounded-full text-gray-500 transition-colors hover:bg-white/5 hover:text-white"
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" className="h-4 w-4" aria-hidden="true">
            <path d="M18 6 6 18M6 6l12 12" />
          </svg>
        </button>

        <img src="/Spiritpedia_Header_Symbol.png" alt="" aria-hidden="true" className="mx-auto block h-9 w-9 object-contain" />
        <h2 id={titleId} className="mt-3 text-2xl font-bold text-white">
          Your area
        </h2>
        <p className="mt-2 text-sm leading-relaxed text-gray-400">
          To show practitioners near you. Only your town is kept, never your exact location.
        </p>

        {current && (
          <p className="mt-4 text-sm text-white">
            <span className="font-semibold">{placeLabel(current)}</span>{' '}
            <button type="button" onClick={() => choose(null)} className="ml-2 text-gray-400 underline-offset-2 hover:text-white hover:underline">
              Clear
            </button>
          </p>
        )}

        {!typing ? (
          <div className="mt-6 flex flex-col gap-2">
            <button
              type="button"
              onClick={useLocation}
              disabled={busy}
              className="w-full rounded-full bg-[#7c3aed] px-6 py-3.5 text-base font-semibold text-white transition-all hover:bg-[#6d28d9] disabled:opacity-50"
            >
              {busy ? 'Finding your town…' : 'Use my location'}
            </button>
            <button
              type="button"
              onClick={() => setTyping(true)}
              className="w-full rounded-full border border-white/20 px-6 py-3.5 text-base font-semibold text-white transition-colors hover:border-white/40 hover:bg-white/5"
            >
              Type my city
            </button>
          </div>
        ) : (
          <div className="mt-6 text-left">
            <label htmlFor="area-search" className="sr-only">
              Your town or city
            </label>
            <input
              id="area-search"
              type="text"
              autoFocus
              autoComplete="off"
              value={query}
              onChange={(e) => search(e.target.value)}
              placeholder="Your town or city"
              className="w-full rounded-full border border-white/10 bg-[#0a0f1d] px-5 py-3 text-sm text-white placeholder:text-gray-600 focus:border-[#7c3aed] focus:outline-none"
            />
            <ul className="mt-2 max-h-72 overflow-y-auto">
              {results.map((p) => (
                <li key={p.id}>
                  <button
                    type="button"
                    onClick={() => choose(p)}
                    className="w-full rounded-xl px-4 py-2.5 text-left text-sm text-white hover:bg-white/5"
                  >
                    <span className="font-semibold">{p.name}</span>
                    <span className="text-gray-400"> · {[p.region, p.country].filter(Boolean).join(', ')}</span>
                  </button>
                </li>
              ))}
            </ul>
            {query.trim().length >= 2 && !searching && results.length === 0 && (
              <p className="mt-2 text-sm text-gray-400">No town by that name yet. Try the nearest larger town.</p>
            )}
          </div>
        )}

        {message && <p className="mt-4 text-sm leading-relaxed text-gray-400">{message}</p>}
      </div>
    </div>
  );
}
