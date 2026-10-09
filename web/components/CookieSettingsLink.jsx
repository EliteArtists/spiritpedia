'use client';

import { openCookieSettings } from '../utils/consent.js';

// "Cookie settings" — reopens the cookie banner so a choice can be changed or
// withdrawn. A button, not a link: it navigates nowhere. Styled by the caller
// so it can sit in the footer row and inside the Privacy Policy's prose.
export default function CookieSettingsLink({ className = 'text-[#a78bfa] underline-offset-2 hover:underline' }) {
  return (
    <button type="button" onClick={openCookieSettings} className={className}>
      Cookie settings
    </button>
  );
}
