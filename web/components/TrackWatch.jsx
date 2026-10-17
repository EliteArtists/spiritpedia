'use client';

import { useEffect, useRef } from 'react';
import { trackContent } from '../utils/activity.js';

// Counts a watch start (utils/activity.js) for the video inside it. The embed
// is a plain YouTube frame, which tells the page nothing; a click into the
// frame moves focus to it and blurs this window, and that is the moment play is
// pressed. A click on an outbound "Watch on …" link counts too. Once per page.
export default function TrackWatch({ slug, className, children }) {
  const ref = useRef(null);
  const done = useRef(false);

  useEffect(() => {
    const mark = () => {
      if (done.current) return;
      done.current = true;
      trackContent('watch', 'video', slug);
    };
    const onBlur = () => {
      const active = document.activeElement;
      if (active?.tagName === 'IFRAME' && ref.current?.contains(active)) mark();
    };
    const onClick = (event) => {
      if (event.target.closest?.('a[href]')) mark();
    };
    const box = ref.current;
    window.addEventListener('blur', onBlur);
    box?.addEventListener('click', onClick);
    return () => {
      window.removeEventListener('blur', onBlur);
      box?.removeEventListener('click', onClick);
    };
  }, [slug]);

  return (
    <div ref={ref} className={className}>
      {children}
    </div>
  );
}
