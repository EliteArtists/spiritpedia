'use client';

import { useState } from 'react';

export default function AdminLoginPage() {
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setSubmitting(true);
    setError('');
    try {
      const res = await fetch('/api/admin/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password }),
      });
      if (res.ok) {
        // Full navigation (not a router push) so the middleware re-runs and sees
        // the freshly-set session cookie before the dashboard renders.
        window.location.href = '/admin';
        return;
      }
      setError('Incorrect password');
      setSubmitting(false);
    } catch {
      setError('Incorrect password');
      setSubmitting(false);
    }
  }

  return (
    <div className="bg-[#0a0f1d] min-h-screen">
      <div className="bg-[#111827] rounded-2xl p-8 max-w-sm mx-auto mt-32">
        <div className="text-center mb-6">
          <span className="text-2xl font-black tracking-widest bg-clip-text text-transparent bg-gradient-to-r from-cyan-400 to-emerald-400">
            SPIRITPEDIA
          </span>
        </div>

        <h1 className="text-xl font-bold text-white mb-6">Admin Access</h1>

        <form onSubmit={handleSubmit}>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Enter admin password"
            autoFocus
            className="w-full rounded-lg bg-[#0a0f1d] border border-gray-700 px-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:border-violet-500 transition-colors"
          />

          {error && <p className="text-red-400 text-sm mt-2">{error}</p>}

          <button
            type="submit"
            disabled={submitting}
            className="w-full mt-6 bg-violet-600 hover:bg-violet-700 text-white font-bold py-3 rounded-lg transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
          >
            {submitting ? 'Checking…' : 'Enter'}
          </button>
        </form>
      </div>
    </div>
  );
}
