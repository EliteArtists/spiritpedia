'use client';

import { useEffect, useId, useState } from 'react';
import { supabaseAuth } from '../utils/supabaseAuth.js';

// "Let Spiritpedia learn from what I explore" (migration 0021): the member's
// own switch, off until they turn it on. On, what they open, watch, save,
// share and review, and the subjects their searches lead to, shape the order of
// what they see in the app. Off, the database deletes what was learned at once.
// The same switch is in the app's Tailor Spiritpedia.
export default function LearningSwitch({ userId }) {
  const [on, setOn] = useState(null);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState(null);
  const labelId = useId();

  useEffect(() => {
    let cancelled = false;
    supabaseAuth
      .from('user_preferences')
      .select('learning_enabled')
      .eq('user_id', userId)
      .maybeSingle()
      .then(({ data }) => {
        if (!cancelled) setOn(Boolean(data?.learning_enabled));
      });
    return () => {
      cancelled = true;
    };
  }, [userId]);

  const flip = async () => {
    if (saving || on === null) return;
    const next = !on;
    setSaving(true);
    setMessage(null);
    const { error } = await supabaseAuth
      .from('user_preferences')
      .upsert({ user_id: userId, learning_enabled: next }, { onConflict: 'user_id' });
    setSaving(false);
    if (error) {
      setMessage('That didn’t save. Please try again.');
      return;
    }
    setOn(next);
    setMessage(next ? null : 'Off. What Spiritpedia had learned has been deleted.');
  };

  return (
    <div className="rounded-2xl border border-white/10 bg-[#111827] p-5 text-left">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p id={labelId} className="text-sm font-semibold text-white">
            Let Spiritpedia learn from what I explore
          </p>
          <p className="mt-1 text-sm leading-relaxed text-gray-400">
            Used only to tailor what you see. Never shown to our team, never shared, never used for
            advertising. Turn off anytime.
          </p>
        </div>
        <button
          type="button"
          role="switch"
          aria-checked={Boolean(on)}
          aria-labelledby={labelId}
          disabled={on === null || saving}
          onClick={flip}
          className={`relative mt-0.5 h-7 w-12 shrink-0 rounded-full transition-colors disabled:opacity-50 ${
            on ? 'bg-[#7c3aed]' : 'bg-white/15'
          }`}
        >
          <span
            className={`absolute top-1 h-5 w-5 rounded-full bg-white transition-all ${on ? 'left-6' : 'left-1'}`}
          />
        </button>
      </div>
      {message && <p className="mt-3 text-sm text-gray-400">{message}</p>}
    </div>
  );
}
