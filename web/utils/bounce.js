// Resend's bounce type in a word (owner, 26 Nov 2026): "temporary" (a full
// mailbox, a server that was down) or "permanent" (no such address). Only a
// permanent one stops a journey or blocks an address (utils/resendWebhook.js
// → isPermanentBounce); a temporary one only says that email didn't arrive.
export function bounceKind(type) {
  if (/permanent|hard/i.test(type || '')) return 'permanent';
  if (/transient|temporary|soft|undetermined/i.test(type || '')) return 'temporary';
  return type ? String(type).toLowerCase() : null;
}

export function bounceLabel(type) {
  const kind = bounceKind(type);
  return kind ? `bounced (${kind})` : 'bounced';
}
