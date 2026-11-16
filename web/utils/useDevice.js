'use client';

import { useSyncExternalStore } from 'react';
import { deviceFromUserAgent } from './appStores.js';

// The visitor's kind of device (utils/appStores.js), read once in the browser.
//
// null on the server and in the first frame after it, so cached pages draw
// with both store badges and narrow to one once the browser has said what it
// is: never the wrong store, never a mismatch on hydration. The user-agent
// doesn't change while the page is open, so there is nothing to subscribe to.
let device;

function read() {
  if (device === undefined) {
    try {
      device = deviceFromUserAgent(navigator.userAgent, navigator.maxTouchPoints || 0);
    } catch {
      device = 'other';
    }
  }
  return device;
}

const subscribe = () => () => {};

export function useDevice() {
  return useSyncExternalStore(subscribe, read, () => null);
}
