// The unified queue model.
//
// Every section of the dashboard answers "what needs me next?", so the queue is
// one list of uniform items rather than a table per source. Each source maps
// into the same shape, which is what lets one row component render an
// application, a claim, a flag and a message without knowing the difference.

export const QUEUE_TYPES = {
  application: {
    key: 'application',
    label: 'Application',
    icon: '👤',
    live: true,
    chip: 'border-cyan-500/40 bg-cyan-500/10 text-cyan-300',
  },
  claim: {
    key: 'claim',
    label: 'Claim',
    icon: '✨',
    live: true,
    chip: 'border-violet-500/40 bg-violet-500/10 text-violet-300',
  },
  flag: {
    key: 'flag',
    label: 'Flag',
    icon: '🚩',
    live: false,
    chip: 'border-red-500/40 bg-red-500/10 text-red-300',
  },
  message: {
    key: 'message',
    label: 'Message',
    icon: '💬',
    live: false,
    chip: 'border-sky-500/40 bg-sky-500/10 text-sky-300',
  },
  content: {
    key: 'content',
    label: 'Content',
    icon: '🎬',
    live: false,
    chip: 'border-amber-500/40 bg-amber-500/10 text-amber-300',
  },
  review: {
    key: 'review',
    label: 'Review',
    icon: '📝',
    live: true,
    chip: 'border-amber-500/40 bg-amber-500/10 text-amber-300',
  },
};

export const STATUS_STYLES = {
  pending: 'border-amber-500/40 bg-amber-500/10 text-amber-300',
  incomplete: 'border-slate-600 bg-slate-800 text-slate-400',
  approved: 'border-emerald-500/40 bg-emerald-500/10 text-emerald-300',
  rejected: 'border-red-500/40 bg-red-500/10 text-red-300',
};

// INCOMPLETE is derived, not stored, and deliberately so.
//
// "Skip for now" on the setup form writes nothing but user_type, so those rows
// are indistinguishable from a finished application: both read 'pending'. They
// cannot be marked at the source either — the field-protection trigger pins
// verification_status against any ordinary caller, which is what stops a
// practitioner approving themselves, so the form could not write 'incomplete'
// even if asked to.
//
// Deriving it from the absence of the two fields a healer row cannot be built
// without costs nothing, needs no migration, and is self-correcting: the moment
// someone finishes the form they stop being incomplete.
export function isIncomplete(profile) {
  if (profile.user_type !== 'practitioner') return false;
  if (profile.verification_status !== 'pending') return false;
  return !(profile.full_name || '').trim() || !(profile.modality || '').trim();
}

export function deriveStatus(profile) {
  if (isIncomplete(profile)) return 'incomplete';
  return profile.verification_status || 'pending';
}

// Whether a status is worth showing at all.
//
// Only a practitioner has a verification state that means anything: an explorer
// is not pending, approved or rejected — they simply have an account. And a
// rejection now reverts the account to explorer, so the stale 'rejected' left
// on the row would otherwise brand them with a badge for a review cycle that is
// over. The badge returns by itself if they resubmit, because resubmitting
// makes them a practitioner again.
export function hasVisibleStatus(profile) {
  return profile?.user_type === 'practitioner';
}

export function timeAgo(iso) {
  if (!iso) return '—';
  const seconds = Math.max(0, Math.floor((Date.now() - new Date(iso).getTime()) / 1000));
  if (seconds < 60) return 'just now';
  const mins = Math.floor(seconds / 60);
  if (mins < 60) return `${mins} min${mins === 1 ? '' : 's'}`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours} hour${hours === 1 ? '' : 's'}`;
  const days = Math.floor(hours / 24);
  if (days < 31) return `${days} day${days === 1 ? '' : 's'}`;
  const months = Math.floor(days / 30);
  return `${months} month${months === 1 ? '' : 's'}`;
}

function personName(profile) {
  return (profile.full_name || '').trim() || profile.email || 'Unnamed account';
}

const TIER_WORDS = {
  superhero: 'Superhero',
  ascended_master: 'Ascended Master',
  luminary: 'Luminary',
  local_hero: 'Local Hero',
};

// Build the queue from everything currently readable. Sources with no table yet
// contribute nothing — the chips for those say "soon" rather than "0", because
// zero is a measurement and these have not been measured.
//
// `reviews` is optional and defaults to none, so a caller that has not been
// taught about them yet still gets a queue rather than an exception.
export function buildQueue(profiles, reviews = []) {
  if (!Array.isArray(profiles)) return [];
  const items = [];

  for (const profile of profiles) {
    if (profile.user_type === 'practitioner' && profile.verification_status === 'pending') {
      const incomplete = isIncomplete(profile);
      const place = [profile.location_city, profile.location_country].filter(Boolean).join(', ');
      items.push({
        id: `application:${profile.id}`,
        type: 'application',
        profileId: profile.id,
        at: profile.created_at,
        person: personName(profile),
        title: incomplete ? 'Incomplete practitioner application' : 'New practitioner application',
        detail: incomplete
          ? 'Started setup but has not submitted details'
          : [TIER_WORDS.local_hero, profile.modality, place].filter(Boolean).join(' · '),
        status: deriveStatus(profile),
        profile,
      });
    }

    // A claim only belongs in the queue while it still needs a decision.
    //
    // Approving an application sets linked_healer_slug, so every practitioner
    // the dashboard has ever published would otherwise sit here permanently as
    // an approved "Claim" with nothing to do — and the two cases are
    // indistinguishable from these fields alone, since claim_healer_profile()
    // auto-approves a genuine claim too.
    //
    // The consequence, so it is not later mistaken for a fault: this filter
    // leaves the queue's Claims count at 0 in normal operation, because every
    // real claim is approved the moment it is made. /admin/claims still lists
    // them all — that page is a record, this is a worklist.
    if (profile.linked_healer_slug && profile.verification_status !== 'approved') {
      items.push({
        id: `claim:${profile.id}`,
        type: 'claim',
        profileId: profile.id,
        at: profile.created_at,
        person: personName(profile),
        title: 'Claimed existing profile',
        detail: `/healers/${profile.linked_healer_slug}`,
        status: profile.verification_status || 'pending',
        profile,
      });
    }
  }

  // A pending review is the one queue item that is not about a person.
  //
  // It carries `href` instead of a `profile`, and that single field is what
  // keeps it out of the three-pane reviewer: QueueTable sends a row with an
  // href straight to that page rather than opening it in place. Without it the
  // reviewer would fall through to its claim branch, read `item.profile.email`
  // off an object that has none, and link to /healers/undefined.
  //
  // Moderating a review is a two-second judgement on a body of text, which is
  // what the Reviews tab is for. The Inbox's job here is to say one is waiting.
  for (const review of Array.isArray(reviews) ? reviews : []) {
    items.push({
      id: `review:${review.id}`,
      type: 'review',
      at: review.created_at,
      // author_name is supplied by the reviewer and may be blank. The same
      // fallback the public review card uses, so one person reads the same way
      // in both places.
      person: review.author_name || 'A Spiritpedia member',
      title: `${review.rating}-star review`,
      detail: `${review.content_type} · ${review.content_slug}`,
      status: 'pending',
      href: '/admin/reviews',
    });
  }

  // Newest first. created_at can tie across a bulk import, so id breaks the tie
  // and keeps the order stable between renders.
  return items.sort((a, b) => {
    const diff = new Date(b.at || 0) - new Date(a.at || 0);
    return diff !== 0 ? diff : a.id.localeCompare(b.id);
  });
}
