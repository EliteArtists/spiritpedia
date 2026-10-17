'use client';

import { useEffect } from 'react';
import { trackOpen } from '../utils/activity.js';

// Counts an item's page being opened (utils/activity.js). Renders nothing.
export default function TrackOpen({ type, slug, subjects }) {
  const key = Array.isArray(subjects) ? subjects.join(',') : '';
  useEffect(() => {
    trackOpen(type, slug, key ? key.split(',') : undefined);
  }, [type, slug, key]);
  return null;
}
