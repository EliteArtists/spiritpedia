// SERVER ONLY (it is handed the service-role client).
//
// An email that must go once per thing it is about — a welcome per account, a
// receipt per claim request — claims its row in email_sends (migration 0025)
// BEFORE sending. The primary key (kind, ref) means two racing requests cannot
// both get the row, so they cannot both send. If the send then fails the row
// is given back, so a later attempt can try again.
//
// send is () => Promise<{ sent }>, normally a call to utils/email.js.
// → { sent: true } | { sent: false, skipped: 'already_sent' } | { sent: false, error }
export async function sendOnce(supabase, { kind, ref }, send) {
  const { error: claimError } = await supabase.from('email_sends').insert({ kind, ref: String(ref) });
  if (claimError) {
    if (claimError.code === '23505') return { sent: false, skipped: 'already_sent' };
    console.error(`[email] could not record ${kind}:`, claimError);
    return { sent: false, error: claimError.message };
  }

  let result;
  try {
    result = await send();
  } catch (err) {
    result = { sent: false, error: err };
  }

  if (!result?.sent) {
    await supabase.from('email_sends').delete().eq('kind', kind).eq('ref', String(ref));
  }
  return result || { sent: false };
}

// When it went, or null. For the admin's "Sent on …".
export async function sentAt(supabase, { kind, ref }) {
  const { data } = await supabase
    .from('email_sends')
    .select('sent_at')
    .eq('kind', kind)
    .eq('ref', String(ref))
    .maybeSingle();
  return data?.sent_at || null;
}

// Forget that it went, so the next one can go: a declined application that is
// sent in again is a new application, with a new receipt.
export async function forgetSent(supabase, { kind, ref }) {
  await supabase.from('email_sends').delete().eq('kind', kind).eq('ref', String(ref));
}
