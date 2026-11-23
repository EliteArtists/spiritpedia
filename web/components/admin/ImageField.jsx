'use client';

import { useRef, useState } from 'react';
import { ACCEPTED_TYPES, fitInside } from '@/utils/imageUpload';

// An image link with an "Upload" button beside it (owner, 23 Nov 2026;
// migration 0056). Everywhere the admin sets a picture: a listing's photos or
// logo, a publisher's logo, and each book, offering and free resource image.
//
// Pick a JPG, PNG or WebP from the Mac or the iPad (an iPhone or iPad photo
// arrives as a JPG). It is shrunk here first, so the longer side is at most
// 1600 px (Vercel refuses anything over 4.5 MB, and phone photos often are),
// then /api/admin/upload-image checks it, stores it and returns its link,
// which fills the field. A preview shows what will be saved; nothing changes
// on the listing until the form's own Save is pressed, which logs the old
// picture as any change of link does.
//
// `kind` is the table (healers, publishers, books, courses, free_resources)
// and `slug` the listing, for the folder it is stored in. `inputClass` is the
// form's own input style; `onKeyDown` passes through to the link box.

// Draw it at its new size and encode it: a PNG keeps see-through parts
// (logos), anything else becomes a JPG. Drawing also drops the photo's hidden
// details (location, camera); the browser turns it the right way up.
async function shrink(file) {
  const url = URL.createObjectURL(file);
  try {
    const img = await new Promise((resolve, reject) => {
      const el = new Image();
      el.onload = () => resolve(el);
      el.onerror = () => reject(new Error('That file could not be read as a picture.'));
      el.src = url;
    });
    const { width, height } = fitInside(img.naturalWidth, img.naturalHeight);
    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext('2d');
    const keepClear = file.type === 'image/png' || file.type === 'image/webp';
    if (!keepClear) {
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, 0, width, height);
    }
    ctx.drawImage(img, 0, 0, width, height);
    const encode = (type, quality) => new Promise((resolve) => canvas.toBlob(resolve, type, quality));
    let blob = keepClear ? await encode('image/png') : await encode('image/jpeg', 0.88);
    // A large PNG photo would be refused for its size: sent as a JPG instead.
    if (blob && blob.size > 3.5 * 1024 * 1024) {
      ctx.globalCompositeOperation = 'destination-over';
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, 0, width, height);
      blob = await encode('image/jpeg', 0.85);
    }
    if (!blob) throw new Error('That picture could not be prepared.');
    return blob;
  } finally {
    URL.revokeObjectURL(url);
  }
}

export default function ImageField({ value, onChange, kind, slug, placeholder = 'https://…', inputClass = '', onKeyDown, autoFocus = false }) {
  const picker = useRef(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);
  const [uploaded, setUploaded] = useState(null);

  const upload = async (file) => {
    if (!file) return;
    setError(null);
    if (!ACCEPTED_TYPES.includes(file.type)) {
      setError('Only JPG, PNG or WebP pictures.');
      return;
    }
    setBusy(true);
    try {
      const blob = await shrink(file);
      const body = new FormData();
      body.append('file', blob, blob.type === 'image/png' ? 'upload.png' : 'upload.jpg');
      body.append('kind', kind);
      body.append('slug', slug || '');
      const res = await fetch('/api/admin/upload-image', { method: 'POST', body });
      const json = await res.json().catch(() => ({}));
      if (!res.ok || json.error) throw new Error(json.message || json.error || `Upload failed (${res.status})`);
      setUploaded(json.url);
      onChange(json.url);
    } catch (err) {
      setError(err.message);
    }
    setBusy(false);
  };

  return (
    <div className="min-w-0 flex-1">
      <div className="flex items-center gap-2">
        <input
          type="text"
          value={value ?? ''}
          autoFocus={autoFocus}
          onChange={(e) => {
            setUploaded(null);
            onChange(e.target.value);
          }}
          onKeyDown={onKeyDown}
          placeholder={placeholder}
          className={`min-w-0 flex-1 ${inputClass}`}
        />
        <button
          type="button"
          onClick={() => picker.current?.click()}
          disabled={busy}
          className="shrink-0 rounded-full border border-white/15 px-3 py-1.5 text-[11px] font-bold text-slate-200 hover:bg-white/5 disabled:opacity-40"
        >
          {busy ? 'Uploading…' : 'Upload'}
        </button>
        <input
          ref={picker}
          type="file"
          accept={ACCEPTED_TYPES.join(',')}
          className="hidden"
          onChange={(e) => {
            upload(e.target.files?.[0]);
            e.target.value = '';
          }}
        />
      </div>
      {error && <p className="mt-1 text-[11px] text-red-400">{error}</p>}
      {uploaded && uploaded === value && (
        <div className="mt-2 flex items-center gap-3">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={uploaded} alt="The uploaded picture" className="h-24 max-w-[12rem] rounded-lg border border-white/10 bg-white/5 object-contain" />
          <p className="text-[11px] leading-relaxed text-emerald-300">Uploaded. Check it, then press Save to use it.</p>
        </div>
      )}
    </div>
  );
}
