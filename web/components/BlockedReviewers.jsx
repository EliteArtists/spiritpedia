'use client';

import { useEffect, useState } from 'react';
import { supabaseAuth } from '../utils/supabaseAuth.js';

// "Blocked reviewers" on the account page: the app's My Account card. Reads
// and unblocks the person's own user_blocks rows (migration 0015; RLS returns
// nothing else). Shown only when there is someone to unblock.
export default function BlockedReviewers({ userId }) {
  const [blocked, setBlocked] = useState([]);
  const [error, setError] = useState(null);

  useEffect(() => {
    let cancelled = false;
    supabaseAuth
      .from('user_blocks')
      .select('blocked_id, blocked_name')
      .eq('blocker_id', userId)
      .order('created_at', { ascending: false })
      .then(({ data }) => {
        if (!cancelled) setBlocked(data || []);
      });
    return () => {
      cancelled = true;
    };
  }, [userId]);

  const unblock = async (blockedId) => {
    setError(null);
    const { error: deleteError } = await supabaseAuth
      .from('user_blocks')
      .delete()
      .eq('blocker_id', userId)
      .eq('blocked_id', blockedId);
    if (deleteError) {
      setError('That could not be done just now. Please try again.');
      return;
    }
    setBlocked((rows) => rows.filter((r) => r.blocked_id !== blockedId));
  };

  if (blocked.length === 0) return null;

  return (
    <div className="rounded-2xl border border-white/10 bg-[#111827] p-5 text-left">
      <h2 className="text-sm font-semibold text-white">Blocked reviewers</h2>
      <p className="mt-1 text-xs text-gray-500">Their reviews are hidden from you while you&rsquo;re signed in.</p>
      <ul className="mt-3 divide-y divide-white/10">
        {blocked.map((b) => (
          <li key={b.blocked_id} className="flex items-center justify-between gap-4 py-2.5 text-sm">
            <span className="text-gray-300">{b.blocked_name?.trim() || 'A Spiritpedia member'}</span>
            <button
              type="button"
              onClick={() => unblock(b.blocked_id)}
              className="text-xs font-semibold text-violet-400 transition-colors hover:text-violet-300"
            >
              Unblock
            </button>
          </li>
        ))}
      </ul>
      {error && <p className="mt-2 text-xs text-red-400">{error}</p>}
    </div>
  );
}
