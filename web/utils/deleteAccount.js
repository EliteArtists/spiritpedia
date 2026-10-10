// Deleting an account — the one implementation, used by the self-serve route
// (POST /api/account/delete: the website's account page and the app) and by the
// admin's person record. Server only: it needs the service role client.
//
// WHAT GOES. The auth user. Four foreign keys cascade off it — user_profiles,
// user_favourites, reviews and admin_notes — so one delete removes the profile,
// everything saved, every review and every internal note about the person.
// Their uploaded photos (practitioner-images/{user id}/…) are removed too.
//
// WHAT STAYS. A claimed public listing. healers has no foreign key onto the
// account and the directory is editorial content, so the listing remains,
// unclaimed — and with it the contact details and photos an approved
// practitioner added. Photos the listing still displays are therefore KEPT
// (deleting them would break the public page), and a self-serve deletion of an
// account with a claimed listing leaves a row in account_deletions so the Inbox
// can review the listing and remove what its owner added. That row holds no
// personal data.

export const PRACTITIONER_IMAGES_BUCKET = 'practitioner-images';

// Which uploaded files can go: every one the public listing does not display.
// A listing image is a public URL ending in /practitioner-images/{path}.
export function splitImages(paths, listingImageUrls = []) {
  const shown = (listingImageUrls || []).filter(Boolean).map(String);
  const keep = [];
  const remove = [];
  for (const path of paths) {
    const used = shown.some((url) => url.includes(`/${PRACTITIONER_IMAGES_BUCKET}/${path}`));
    (used ? keep : remove).push(path);
  }
  return { keep, remove };
}

async function listUploads(supabase, userId) {
  const paths = [];
  for (let offset = 0; ; offset += 100) {
    const { data, error } = await supabase.storage
      .from(PRACTITIONER_IMAGES_BUCKET)
      .list(userId, { limit: 100, offset });
    if (error || !data) break;
    paths.push(...data.filter((f) => f.name && f.id).map((f) => `${userId}/${f.name}`));
    if (data.length < 100) break;
  }
  return paths;
}

// → { ok: true, flagged, removedImages, keptImages, linkedHealerSlug }
//   { ok: false, status, error }
//
// `source` is 'website' or 'app' for a self-serve deletion (which flags a
// practitioner in the Inbox), or 'admin' (the admin is already looking).
export async function deleteAccount(supabase, userId, { source }) {
  if (!supabase || !userId) return { ok: false, status: 400, error: 'missing_user' };

  const { data: profile } = await supabase
    .from('user_profiles')
    .select('user_type, linked_healer_slug')
    .eq('id', userId)
    .maybeSingle();
  const linkedHealerSlug = profile?.linked_healer_slug || null;

  let listingImages = [];
  if (linkedHealerSlug) {
    const { data: healer } = await supabase
      .from('healers')
      .select('image_urls')
      .eq('healer_slug', linkedHealerSlug)
      .maybeSingle();
    listingImages = healer?.image_urls || [];
  }
  const { keep, remove } = splitImages(await listUploads(supabase, userId), listingImages);

  // The Inbox record goes in FIRST. If it cannot be written, nothing is
  // deleted — a practitioner's listing must never be orphaned unseen.
  // Only a claimed listing leaves anything behind to review: an unapproved
  // practitioner's details lived on user_profiles, which the cascade removes.
  const needsReview = source !== 'admin' && Boolean(linkedHealerSlug);
  let flagId = null;
  if (needsReview) {
    const { data: flag, error: flagError } = await supabase
      .from('account_deletions')
      .insert({
        source,
        user_type: profile?.user_type || null,
        linked_healer_slug: linkedHealerSlug,
        kept_image_count: keep.length,
      })
      .select('id')
      .single();
    if (flagError) return { ok: false, status: 500, error: 'flag_failed' };
    flagId = flag.id;
  }

  const { error } = await supabase.auth.admin.deleteUser(userId);
  if (error) {
    if (flagId) await supabase.from('account_deletions').delete().eq('id', flagId);
    return { ok: false, status: 500, error: 'delete_failed' };
  }

  // Photos only once the account is really gone, so a failed delete loses
  // nothing. A failure here leaves files nobody can reach by account; it is
  // reported, not retried.
  let removedImages = 0;
  if (remove.length > 0) {
    const { data: removed } = await supabase.storage.from(PRACTITIONER_IMAGES_BUCKET).remove(remove);
    removedImages = removed?.length || 0;
  }

  return {
    ok: true,
    flagged: Boolean(flagId),
    removedImages,
    keptImages: keep.length,
    linkedHealerSlug,
  };
}
