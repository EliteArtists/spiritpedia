'use client';

import { useCallback, useEffect, useId, useRef, useState } from 'react';

// Share button for detail pages and the homepage nav.
//
// Two modes, chosen on the client after mount:
//   • Native — `navigator.share` on a touch-primary device opens the OS share
//     sheet (WhatsApp, Messages, Mail, AirDrop… whatever is installed).
//   • Dropdown — everywhere else, a small menu of platform intents plus Copy Link.
//
// The mode is NOT a bare `navigator.share` feature check: desktop Chrome and
// Safari on macOS implement it too (it opens the macOS share sheet), which has
// far fewer targets than the dropdown and no WhatsApp/X/Facebook. Requiring a
// coarse pointer keeps the native sheet to phones and tablets. If the native
// call throws for any reason other than the user dismissing it, the dropdown
// opens instead so the button never dead-ends.
//
// `url` must be the absolute page URL, built by the server component from
// SITE_URL — this component never reads window.location, so the shared link
// is stable across proxies, previews and the www redirect.

function encode(s) {
  return encodeURIComponent(s);
}

// Platform intents. Every interpolated value is encodeURIComponent'd.
function shareTargets(url, title) {
  return [
    {
      key: 'whatsapp',
      label: 'WhatsApp',
      href: `https://wa.me/?text=${encode(`${title} ${url}`)}`,
      Icon: WhatsAppIcon,
    },
    {
      key: 'x',
      label: 'X / Twitter',
      href: `https://twitter.com/intent/tweet?text=${encode(title)}&url=${encode(url)}`,
      Icon: XIcon,
    },
    {
      key: 'facebook',
      label: 'Facebook',
      href: `https://www.facebook.com/sharer/sharer.php?u=${encode(url)}`,
      Icon: FacebookIcon,
    },
    {
      key: 'email',
      label: 'Email',
      href: `mailto:?subject=${encode(title)}&body=${encode(`${title} ${url}`)}`,
      Icon: MailIcon,
    },
  ];
}

export default function ShareButton({ url, title, className = '' }) {
  const [open, setOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const [nativeShare, setNativeShare] = useState(false);
  const rootRef = useRef(null);
  const copiedTimer = useRef(null);
  const menuId = useId();

  // Decide the mode after mount — `navigator` does not exist during SSR, and
  // the pointer media query is only meaningful in a real browser.
  useEffect(() => {
    const canShare = typeof navigator !== 'undefined' && typeof navigator.share === 'function';
    const touchPrimary =
      typeof window !== 'undefined' &&
      typeof window.matchMedia === 'function' &&
      window.matchMedia('(pointer: coarse)').matches;
    setNativeShare(canShare && touchPrimary);
  }, []);

  // Close on outside click / tap and on Escape while the dropdown is open.
  useEffect(() => {
    if (!open) return undefined;
    const onPointerDown = (e) => {
      if (rootRef.current && !rootRef.current.contains(e.target)) setOpen(false);
    };
    const onKeyDown = (e) => {
      if (e.key === 'Escape') setOpen(false);
    };
    document.addEventListener('pointerdown', onPointerDown);
    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.removeEventListener('pointerdown', onPointerDown);
      document.removeEventListener('keydown', onKeyDown);
    };
  }, [open]);

  // Clear the toast timer if the component unmounts mid-toast.
  useEffect(() => () => clearTimeout(copiedTimer.current), []);

  const showCopied = useCallback(() => {
    setCopied(true);
    clearTimeout(copiedTimer.current);
    copiedTimer.current = setTimeout(() => setCopied(false), 2000);
  }, []);

  const copyLink = useCallback(async () => {
    try {
      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(url);
      } else {
        // Non-secure context fallback (plain http on a LAN, say).
        const ta = document.createElement('textarea');
        ta.value = url;
        ta.setAttribute('readonly', '');
        ta.style.position = 'fixed';
        ta.style.opacity = '0';
        document.body.appendChild(ta);
        ta.select();
        document.execCommand('copy');
        document.body.removeChild(ta);
      }
      setOpen(false);
      showCopied();
    } catch {
      // Clipboard permission denied — leave the menu open so the user can
      // pick another target rather than seeing a false "copied" toast.
    }
  }, [url, showCopied]);

  const onButtonClick = useCallback(async () => {
    if (nativeShare) {
      try {
        await navigator.share({ title, url });
        return;
      } catch (err) {
        // AbortError = the user closed the sheet. Anything else means the
        // native path is unusable here; fall through to the dropdown.
        if (err?.name === 'AbortError') return;
      }
    }
    setOpen((v) => !v);
  }, [nativeShare, title, url]);

  const targets = shareTargets(url, title);

  return (
    <div ref={rootRef} className={`relative inline-block ${className}`}>
      <button
        type="button"
        onClick={onButtonClick}
        aria-label="Share"
        aria-haspopup={nativeShare ? undefined : 'menu'}
        aria-expanded={nativeShare ? undefined : open}
        aria-controls={nativeShare ? undefined : menuId}
        className="flex h-10 w-10 items-center justify-center rounded-full bg-white/10 text-white backdrop-blur-sm transition-colors duration-200 hover:bg-white/20"
      >
        <ShareIcon />
      </button>

      {/* Desktop dropdown — right-aligned under the button. */}
      {open && !nativeShare && (
        <div
          id={menuId}
          role="menu"
          className="absolute right-0 z-50 mt-2 w-52 rounded-xl border border-white/10 bg-[#111827] p-2 shadow-2xl"
        >
          {targets.map(({ key, label, href, Icon }) => (
            <a
              key={key}
              role="menuitem"
              href={href}
              target={key === 'email' ? undefined : '_blank'}
              rel={key === 'email' ? undefined : 'noopener noreferrer'}
              onClick={() => setOpen(false)}
              className="flex cursor-pointer items-center gap-3 rounded-lg px-4 py-2 text-sm text-white hover:bg-white/5"
            >
              <Icon />
              <span>{label}</span>
            </a>
          ))}
          <button
            type="button"
            role="menuitem"
            onClick={copyLink}
            className="flex w-full cursor-pointer items-center gap-3 rounded-lg px-4 py-2 text-left text-sm text-white hover:bg-white/5"
          >
            <LinkIcon />
            <span>Copy Link</span>
          </button>
        </div>
      )}

      {/* "Link copied!" toast — 2 seconds, anchored under the button. */}
      {copied && (
        <div
          role="status"
          aria-live="polite"
          className="absolute right-0 z-50 mt-2 whitespace-nowrap rounded-full border border-white/10 bg-[#111827] px-3 py-1.5 text-xs font-semibold text-white shadow-2xl"
        >
          Link copied!
        </div>
      )}
    </div>
  );
}

/* ── Icons — 16–18px, currentColor, no external assets ─────────────────── */

function ShareIcon() {
  // The standard "arrow out of a tray" share glyph.
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M4 12v7a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-7" />
      <polyline points="16 6 12 2 8 6" />
      <line x1="12" y1="2" x2="12" y2="15" />
    </svg>
  );
}

function WhatsAppIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M17.47 14.38c-.3-.15-1.76-.87-2.03-.97-.27-.1-.47-.15-.67.15-.2.3-.77.97-.94 1.17-.17.2-.35.22-.64.07-.3-.15-1.26-.46-2.39-1.48-.88-.79-1.48-1.76-1.65-2.06-.17-.3-.02-.46.13-.6.13-.14.3-.35.45-.52.15-.17.2-.3.3-.5.1-.2.05-.37-.03-.52-.07-.15-.67-1.6-.91-2.2-.24-.58-.49-.5-.67-.5h-.57c-.2 0-.52.07-.79.37-.27.3-1.04 1.02-1.04 2.48s1.07 2.88 1.21 3.08c.15.2 2.1 3.2 5.08 4.49.71.3 1.26.49 1.7.63.71.23 1.36.2 1.87.12.57-.09 1.76-.72 2.01-1.42.25-.7.25-1.3.17-1.42-.07-.13-.27-.2-.57-.35M12.05 21.8h-.01a9.8 9.8 0 0 1-5-1.37l-.36-.21-3.72.98.99-3.63-.23-.37a9.8 9.8 0 0 1-1.5-5.23c0-5.42 4.41-9.83 9.84-9.83 2.63 0 5.1 1.03 6.95 2.88a9.77 9.77 0 0 1 2.88 6.96c0 5.42-4.42 9.82-9.84 9.82m8.37-18.2A11.8 11.8 0 0 0 12.05 0C5.5 0 .16 5.34.16 11.9c0 2.1.55 4.15 1.59 5.95L0 24l6.3-1.65a11.9 11.9 0 0 0 5.74 1.46h.01c6.55 0 11.89-5.34 11.89-11.9 0-3.18-1.24-6.17-3.49-8.42" />
    </svg>
  );
}

function XIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M18.24 2.25h3.31l-7.23 8.26 8.5 11.24h-6.66l-5.21-6.82-5.97 6.82H1.67l7.73-8.84L1.25 2.25h6.83l4.71 6.23 5.45-6.23zm-1.16 17.52h1.83L7.08 4.13H5.12l11.96 15.64z" />
    </svg>
  );
}

function FacebookIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M24 12.07C24 5.4 18.63 0 12 0S0 5.4 0 12.07C0 18.1 4.39 23.09 10.13 24v-8.44H7.08v-3.49h3.05V9.41c0-3.02 1.79-4.69 4.53-4.69 1.31 0 2.69.24 2.69.24v2.97h-1.52c-1.49 0-1.96.93-1.96 1.89v2.25h3.33l-.53 3.49h-2.8V24C19.61 23.09 24 18.1 24 12.07" />
    </svg>
  );
}

function MailIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <rect x="3" y="5" width="18" height="14" rx="2" />
      <path d="m3 7 9 6 9-6" />
    </svg>
  );
}

function LinkIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" />
      <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" />
    </svg>
  );
}
