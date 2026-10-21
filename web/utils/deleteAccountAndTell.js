// SERVER ONLY (it is handed the service-role client).
//
// Delete an account (utils/deleteAccount.js) and then, if it worked, tell the
// person: "Your Spiritpedia account has been deleted" (D13). The address and
// name are read BEFORE the account goes, because afterwards there is nothing
// left to read them from. Nothing is sent for a deletion that failed.
//
// Pending emails are gone before this sends: Day 4 and discovery emails are
// worked out from the account itself, and its unsubscribe row
// (email_preferences) goes with it. The once-only records naming the account
// (email_sends) are cleared too: they would only ever describe someone who is
// no longer here.
import { deleteAccount } from './deleteAccount.js';
import { firstNameFrom, sendEmail } from './email.js';
import { accountDeleted } from './emailTemplates.js';

export async function deleteAccountAndTell(supabase, userId, { source, notify = true }) {
  let recipient = null;
  if (notify) {
    const [{ data: authUser }, { data: profile }] = await Promise.all([
      supabase.auth.admin.getUserById(userId),
      supabase.from('user_profiles').select('full_name').eq('id', userId).maybeSingle(),
    ]);
    if (authUser?.user?.email) {
      recipient = { email: authUser.user.email, firstName: firstNameFrom(profile?.full_name) };
    }
  }

  const result = await deleteAccount(supabase, userId, { source });
  if (!result.ok) return result;

  await supabase.from('email_sends').delete().eq('ref', userId);
  await supabase.from('email_sends').delete().like('ref', `${userId}:%`);

  let notified = null;
  if (recipient) {
    try {
      const sent = await sendEmail({ to: recipient.email, ...accountDeleted({ firstName: recipient.firstName }) });
      notified = Boolean(sent.sent);
    } catch (err) {
      console.error('[delete] account deleted email failed:', err);
      notified = false;
    }
  }
  return { ...result, notified };
}
