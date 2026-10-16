// Saving needs an account (the app works the same way).
//
// A signed-out heart or Save does not save: it asks — "Save it to your
// Library" — through the one prompt mounted in the layout
// (components/SavePrompt.jsx). If the visitor goes on to sign in from it, the
// save they asked for waits here, in this tab, and AuthSync makes it as soon
// as the account's library has been brought down, so nothing overwrites it.
// Taking something OUT of a library never asks: saves already on this
// browser stay theirs, and still move into the account at sign-in.
//
// Plain ES module with no React dependency, so `node --test` can import it.

export const SAVE_PROMPT_EVENT = 'spiritpedia:save-prompt';
export const PENDING_SAVE_KEY = 'spiritpedia:pending-save';

// Opens the prompt for one item. detail: { key, slug }.
export function askToSave(key, slug) {
  try {
    window.dispatchEvent(new CustomEvent(SAVE_PROMPT_EVENT, { detail: { key, slug } }));
  } catch {
    // No window (tests, SSR): nothing to show.
  }
}

// The save to make once signed in. sessionStorage: it belongs to this tab and
// this moment, never to a later visit.
export function setPendingSave(key, slug, storage = globalThis.sessionStorage) {
  try {
    storage.setItem(PENDING_SAVE_KEY, JSON.stringify({ key, slug: String(slug) }));
  } catch {
    // Storage unavailable: signing in still works; the save is simply not made.
  }
}

export function clearPendingSave(storage = globalThis.sessionStorage) {
  try {
    storage.removeItem(PENDING_SAVE_KEY);
  } catch {
    // Nothing to clear.
  }
}

// Reads and forgets it, so it is made once. Null if there is none, or it is
// not something we wrote.
export function takePendingSave(storage = globalThis.sessionStorage) {
  try {
    const raw = storage.getItem(PENDING_SAVE_KEY);
    storage.removeItem(PENDING_SAVE_KEY);
    const value = JSON.parse(raw || 'null');
    return value && typeof value.key === 'string' && value.slug ? value : null;
  } catch {
    return null;
  }
}
