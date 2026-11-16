import AppBannerStrip from './AppBannerStrip';
import { BANNER_ID, BANNER_KEY } from '@/utils/appStores';

// utils/consent.js's CONSENT_KEY. Repeated, not imported: that module is a
// client one, and a server component would receive a reference, not the text.
const CONSENT_KEY = 'sp_cookie_consent';

// The Android "Get the app" strip, at the top of every public page (owner,
// 16 Nov 2026; docs/reports/2026-11-16-app-links-plan.md §2).
//
// WHO SEES IT: Android phones and tablets, in any browser, once the cookie
// question has been answered (one question at a time: it waits for the next
// page after the choice), and not within 30 days of an × or 90 days of a tap
// on "Get the app". Never on /admin or /auth/* (AppBannerStrip). iPhones and
// iPads get Apple's own Smart App Banner instead (metadata.itunes in
// app/layout.js), computers get nothing.
//
// WHY A SCRIPT: pages are cached and the same for everyone, so the server
// can't decide. This runs as the HTML is read, before the first paint, and
// only adds data-show to the strip, which is in the page but hidden. Nothing
// moves after the visitor starts reading, and there are no listeners.
const SCRIPT = `(function(){try{var e=document.getElementById(${JSON.stringify(BANNER_ID)});if(!e)return;var c=localStorage.getItem(${JSON.stringify(CONSENT_KEY)});var h=Number(localStorage.getItem(${JSON.stringify(BANNER_KEY)}))||0;if(/android/i.test(navigator.userAgent)&&(c==='accepted'||c==='declined')&&Date.now()>=h)e.setAttribute('data-show','')}catch(_){}})()`;

export default function AppBanner() {
  return (
    <>
      <AppBannerStrip />
      <script dangerouslySetInnerHTML={{ __html: SCRIPT }} />
    </>
  );
}
