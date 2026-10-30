'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { supabase } from '@/utils/supabase';

// A school's teachers (migration 0029), on the school's Profile tab: who
// teaches there, as Founder or Instructor, with add and remove. Reads use the
// public client (school_teachers is public data); writes go through
// /api/admin/write like every other content write, since only the service role
// may write the table.

const inputClass =
  'w-full rounded-lg border border-white/10 bg-[#0a0f1d] px-3 py-2 text-sm text-white placeholder-slate-600 focus:border-[#7c3aed] focus:outline-none';
const labelClass = 'text-[10px] font-bold uppercase tracking-wider text-slate-500';

const ROLES = [
  { value: 'instructor', label: 'Instructor' },
  { value: 'founder', label: 'Founder' },
];

async function adminWrite(body) {
  const res = await fetch('/api/admin/write', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  const json = await res.json().catch(() => ({}));
  if (!res.ok || json.error) throw new Error(json.error || `Failed (${res.status})`);
  return json;
}

export default function SchoolTeachers({ school }) {
  const [links, setLinks] = useState(null);
  const [error, setError] = useState(null);
  const [slug, setSlug] = useState('');
  const [role, setRole] = useState('instructor');
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    const { data, error: err } = await supabase
      .from('school_teachers')
      .select('id, role, teacher:healers!school_teachers_teacher_id_fkey(id, name, healer_slug)')
      .eq('school_id', school.id);
    if (err) setError(err.message);
    setLinks((data || []).filter((l) => l.teacher).sort((a, b) => a.teacher.name.localeCompare(b.teacher.name)));
  }, [school.id]);

  useEffect(() => {
    load();
  }, [load]);

  const add = async (e) => {
    e.preventDefault();
    const wanted = slug.trim().toLowerCase();
    if (!wanted || busy) return;
    setBusy(true);
    setError(null);
    try {
      const { data: teacher } = await supabase
        .from('healers')
        .select('id, name, entity_type')
        .eq('healer_slug', wanted)
        .maybeSingle();
      if (!teacher) throw new Error(`No listing with the slug "${wanted}".`);
      if (teacher.id === school.id) throw new Error('A school cannot teach at itself.');
      if (links?.some((l) => l.teacher.id === teacher.id)) throw new Error(`${teacher.name} is already linked.`);
      await adminWrite({ table: 'school_teachers', op: 'insert', values: { school_id: school.id, teacher_id: teacher.id, role } });
      setSlug('');
      setRole('instructor');
      await load();
    } catch (err) {
      setError(err.message);
    }
    setBusy(false);
  };

  const remove = async (link) => {
    if (busy) return;
    setBusy(true);
    setError(null);
    try {
      await adminWrite({ table: 'school_teachers', op: 'delete', match: { id: link.id } });
      setLinks((prev) => prev.filter((l) => l.id !== link.id));
    } catch (err) {
      setError(err.message);
    }
    setBusy(false);
  };

  return (
    <section className="mt-10 rounded-2xl border border-white/10 bg-[#111827] p-5">
      <p className={labelClass}>Teachers at this school</p>
      {links === null ? (
        <p className="mt-3 text-sm text-slate-500">Loading…</p>
      ) : links.length === 0 ? (
        <p className="mt-3 text-sm text-slate-500">No teachers linked yet.</p>
      ) : (
        <ul className="mt-3 divide-y divide-white/5">
          {links.map((l) => (
            <li key={l.id} className="flex items-center justify-between gap-3 py-2 text-sm">
              <span>
                <Link href={`/admin/content/${l.teacher.healer_slug}`} className="text-white hover:text-[#a78bfa]">
                  {l.teacher.name}
                </Link>
                <span className="ml-2 text-xs text-slate-500">{l.role === 'founder' ? 'Founder' : 'Instructor'}</span>
              </span>
              <button
                type="button"
                onClick={() => remove(l)}
                disabled={busy}
                className="text-xs font-bold text-red-400 hover:text-red-300 disabled:opacity-40"
              >
                Remove
              </button>
            </li>
          ))}
        </ul>
      )}

      <form onSubmit={add} className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-[1fr_160px_auto] sm:items-end">
        <label>
          <span className={labelClass}>Teacher's slug</span>
          <input value={slug} onChange={(e) => setSlug(e.target.value)} placeholder="e.g. tevia-feng" className={inputClass} />
        </label>
        <label>
          <span className={labelClass}>Role</span>
          <select value={role} onChange={(e) => setRole(e.target.value)} className={inputClass}>
            {ROLES.map((r) => (
              <option key={r.value} value={r.value}>
                {r.label}
              </option>
            ))}
          </select>
        </label>
        <button
          type="submit"
          disabled={busy || !slug.trim()}
          className="rounded-full bg-[#7c3aed] px-4 py-2 text-xs font-bold text-white hover:bg-[#6d28d9] disabled:opacity-40"
        >
          Add teacher
        </button>
      </form>
      {error && <p className="mt-3 text-xs text-red-400">{error}</p>}
    </section>
  );
}
