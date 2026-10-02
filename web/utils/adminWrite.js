'use client';

// Thin wrapper so the ingestion form's call sites keep their shape.
//
// It returns { data, error } exactly as supabase-js does, which means the
// existing `const { error } = await …` and `({ error } = await …)` patterns in
// ContentIngestion carry on working unchanged — only the transport moves from
// the browser's anon key to the server's service role.
export async function adminWrite({ table, op, values, match, select, single }) {
  try {
    const res = await fetch('/api/admin/write', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ table, op, values, match, select, single }),
    });
    const json = await res.json();
    if (!res.ok || json.error) {
      return { data: null, error: { message: json.error || 'Write failed', code: json.code } };
    }
    return { data: json.data, error: null };
  } catch (err) {
    return { data: null, error: { message: err.message } };
  }
}
