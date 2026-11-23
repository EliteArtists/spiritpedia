-- 0056 — Images uploaded in the admin (owner, 23 Nov 2026).
--
-- Admin → "Upload" beside every image link (a listing's photos or logo, a
-- publisher's logo, and each book, offering and free resource image) stores
-- the picture here and sets the link. /api/admin/upload-image does the
-- storing, with the service role, after the admin cookie: it accepts JPG,
-- PNG and WebP, shrinks anything over 1600 px on its longer side, removes
-- the photo's hidden details (location and camera), and saves a JPG (a PNG
-- when the picture has see-through parts, as logos often do).
--
--   listing-images   public: anyone can view a picture by its link, as
--                    every image on the site is viewed. Nobody but the
--                    service role can add, change or remove one (no
--                    policies on storage.objects for this bucket, and the
--                    service role needs none). 5 MB a picture at most,
--                    images only.
--
-- Paths: <healers|publishers|books|courses|free_resources>/<listing slug>/
-- <time>-<random>.jpg|png. Old pictures are never deleted by the website;
-- the change log keeps the link to the one replaced.
--
-- Separate from practitioner-images (0000), which holds what account owners
-- upload themselves under their own folder. No existing policy changes.
-- Dev first, then live. Safe to run again. Check row at the end.

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES ('listing-images', 'listing-images', true, 5242880, ARRAY['image/jpeg', 'image/png', 'image/webp'])
ON CONFLICT (id) DO UPDATE
  SET public = EXCLUDED.public,
      file_size_limit = EXCLUDED.file_size_limit,
      allowed_mime_types = EXCLUDED.allowed_mime_types;


-- Check -------------------------------------------------------------------
-- Expect on dev and live: true, 5242880, 3, 0.

SELECT
  (SELECT public FROM storage.buckets WHERE id = 'listing-images') AS public,
  (SELECT file_size_limit FROM storage.buckets WHERE id = 'listing-images') AS size_limit,
  (SELECT cardinality(allowed_mime_types) FROM storage.buckets WHERE id = 'listing-images') AS image_types,
  (SELECT count(*) FROM pg_policies WHERE schemaname = 'storage' AND tablename = 'objects'
    AND (qual LIKE '%listing-images%' OR with_check LIKE '%listing-images%')) AS write_policies;
