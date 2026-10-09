-- PRODUCTION BASELINE — the whole `public` schema as it stands in production.
--
-- Exported 9 October 2026 from Supabase project uzmvcgewxgvnybdhvsyx
-- (Postgres 17.6) with pg_dump 17.6:
--     pg_dump --schema-only --schema=public --no-owner
-- Read-only: pg_dump reads inside a read-only snapshot, and no row was
-- written. Verified against the live catalog: 16 tables (all with RLS on),
-- 24 policies, 46 constraints, 43 indexes, 3 functions, 2 triggers — every
-- count matches.
--
-- WHAT THIS FILE IS FOR. Before it, supabase/migrations/ could not rebuild the
-- database: no migration creates healers, books, videos, subjects, courses,
-- free_resources, publishers, publisher_healers or emotion_mappings — they
-- were made in the dashboard. This file is the complete structure: table
-- definitions, constraints, indexes, functions, triggers, RLS policies and
-- grants. No data.
--
-- TO REBUILD INTO A NEW, EMPTY SUPABASE PROJECT:
--   1. Run this file.
--   2. Run supabase/seed/emotion_mappings.sql (the search vocabulary).
--   3. Content rows (healers, books, videos, …) are NOT in the repository —
--      they are live data, not seed. Back them up separately.
-- 0001–0011 are the history this file already contains. Running them after it
-- is harmless (each is idempotent) and unnecessary.
--
-- NOT RE-RUNNABLE against a database that already has these tables: pg_dump
-- writes plain CREATE TABLE, so a second run stops at the first one. That is
-- the right failure — this file is for an empty project, not for production.
--
-- Changed from raw pg_dump output, and only this:
--   * removed the \restrict / \unrestrict lines (psql-only commands that the
--     Supabase SQL editor cannot run)
--   * CREATE SCHEMA public  →  CREATE SCHEMA IF NOT EXISTS public  (every
--     Supabase project already has it)
--   * removed ALTER DEFAULT PRIVILEGES FOR ROLE supabase_admin (Supabase sets
--     these itself, and the postgres role is not permitted to change them)
--   * appended the practitioner-images storage bucket and its four policies on
--     storage.objects, generated read-only from storage.buckets and
--     pg_policies — they live outside `public`, so pg_dump --schema=public
--     does not include them.
--
-- Assumes a Supabase project: the auth, storage and extensions schemas, the
-- anon / authenticated / service_role roles, and auth.uid() / auth.jwt()
-- already exist there.

--
-- PostgreSQL database dump
--


-- Dumped from database version 17.6
-- Dumped by pg_dump version 17.6

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET transaction_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

--
-- Name: public; Type: SCHEMA; Schema: -; Owner: -
--

CREATE SCHEMA IF NOT EXISTS public;


--
-- Name: SCHEMA public; Type: COMMENT; Schema: -; Owner: -
--

COMMENT ON SCHEMA public IS 'standard public schema';


SET default_tablespace = '';

SET default_table_access_method = heap;

--
-- Name: user_profiles; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.user_profiles (
    id uuid NOT NULL,
    user_type text DEFAULT 'explorer'::text NOT NULL,
    full_name text,
    modality text,
    website_url text,
    booking_url text,
    bio text,
    location_city text,
    location_country text,
    availability_type text,
    youtube_url text,
    facebook_url text,
    instagram_url text,
    tiktok_url text,
    twitter_url text,
    subject_slugs text[],
    image_urls text[],
    linked_healer_slug text,
    verification_status text DEFAULT 'pending'::text,
    created_at timestamp with time zone DEFAULT now()
);


--
-- Name: TABLE user_profiles; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.user_profiles IS 'Spiritpedia profile data for an auth
  user. One row per auth.users row.';


--
-- Name: COLUMN user_profiles.user_type; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.user_profiles.user_type IS 'explorer or 
  practitioner';


--
-- Name: COLUMN user_profiles.linked_healer_slug; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.user_profiles.linked_healer_slug IS 'healers.healer_slug once a claim is approved. Admin-set only.';


--
-- Name: COLUMN user_profiles.verification_status; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.user_profiles.verification_status IS 'pending, 
  approved or rejected. Admin-set only.';


--
-- Name: claim_healer_profile(text); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.claim_healer_profile(p_slug text) RETURNS public.user_profiles
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public', 'pg_temp'
    AS $$
  DECLARE
    v_free_domains TEXT[] := ARRAY[
      'gmail.com','googlemail.com','outlook.com','hotmail.com','hotmail.co.uk',
      'live.com','live.co.uk','msn.com','yahoo.com','yahoo.co.uk','ymail.com',
      'icloud.com','me.com','mac.com','aol.com','proton.me','protonmail.com',
      'pm.me','gmx.com','gmx.co.uk','mail.com','yandex.com','zoho.com',
      'btinternet.com','sky.com','virginmedia.com','talktalk.net','tutanota.com'
    ];
    v_uid UUID;
    v_email TEXT;
    v_domain TEXT;
    v_matched BOOLEAN := FALSE;
    v_row public.user_profiles;
  BEGIN
    v_uid := auth.uid();
    IF v_uid IS NULL THEN
      RAISE EXCEPTION 'You must be signed in to claim a profile.';
    END IF;

    SELECT lower(email) INTO v_email FROM auth.users WHERE id = v_uid;
    IF v_email IS NULL OR position('@' in v_email) = 0 THEN
      RAISE EXCEPTION 'No usable email address on this account.';
    END IF;

    v_domain := split_part(v_email, '@', 2);

    PERFORM 1 FROM public.healers
     WHERE healer_slug = p_slug
       AND lower(contact_email) = v_email
     LIMIT 1;
    v_matched := FOUND;

    IF NOT v_matched AND NOT (v_domain = ANY (v_free_domains)) THEN
      PERFORM 1 FROM public.healers
       WHERE healer_slug = p_slug
         AND (website_url ILIKE '%' || v_domain || '%' OR youtube_url ILIKE '%'
  || v_domain || '%')
       LIMIT 1;
      v_matched := FOUND;
    END IF;

    IF NOT v_matched THEN
      RAISE EXCEPTION 'That profile does not match your email address.';
    END IF;

    PERFORM set_config('app.claim_verified', 'true', true);

    INSERT INTO public.user_profiles (id, user_type, linked_healer_slug,
  verification_status)
    VALUES (v_uid, 'practitioner', p_slug, 'approved')
    ON CONFLICT (id) DO UPDATE
      SET user_type = 'practitioner',
          linked_healer_slug = EXCLUDED.linked_healer_slug,
          verification_status = 'approved'
    RETURNING * INTO v_row;

    PERFORM set_config('app.claim_verified', 'false', true);

    RETURN v_row;
  END;
  $$;


--
-- Name: FUNCTION claim_healer_profile(p_slug text); Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON FUNCTION public.claim_healer_profile(p_slug text) IS 'Links the caller to a healer profile after re-checking their email against 
  it server side. The only path that may set linked_healer_slug or 
  verification_status from the browser.';


--
-- Name: reviews_pin_author(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.reviews_pin_author() RETURNS trigger
    LANGUAGE plpgsql
    SET search_path TO 'public', 'pg_temp'
    AS $$
  DECLARE
    v_claim TEXT;
    v_role TEXT;
  BEGIN
    BEGIN
      v_role := nullif(current_setting('request.jwt.claims', true), '')::jsonb ->> 'role';
    EXCEPTION WHEN others THEN
      v_role := 'authenticated';
    END;

    IF v_role IS DISTINCT FROM 'authenticated' AND v_role IS DISTINCT FROM 'anon' THEN
      RETURN NEW;
    END IF;

    IF TG_OP = 'INSERT' THEN
      NEW.user_id := COALESCE(auth.uid(), NEW.user_id);
      NEW.created_at := now();
      NEW.status := 'pending';

      SELECT linked_healer_slug INTO v_claim
        FROM public.user_profiles
       WHERE id = NEW.user_id;
      NEW.author_healer_slug := v_claim;
    ELSE
      NEW.user_id := OLD.user_id;
      NEW.created_at := OLD.created_at;
      NEW.content_type := OLD.content_type;
      NEW.content_slug := OLD.content_slug;
      NEW.status := OLD.status;
      NEW.author_healer_slug := OLD.author_healer_slug;
    END IF;

    RETURN NEW;
  END;
  $$;


--
-- Name: FUNCTION reviews_pin_author(); Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON FUNCTION public.reviews_pin_author() IS 'Pins the columns an author must not control. On insert: user_id, created_at, status forced to pending, and author_healer_slug derived from the users own profile rather than taken from the payload, so nobody can link their name to someone elses healer page. On update: all of those plus the identity columns are frozen, so an edit cannot approve itself or move onto another item.';


--
-- Name: user_profiles_protect_admin_fields(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.user_profiles_protect_admin_fields() RETURNS trigger
    LANGUAGE plpgsql
    SET search_path TO 'public', 'pg_temp'
    AS $$
  DECLARE
    v_role text;
  BEGIN
    IF current_setting('app.claim_verified', true) = 'true' THEN
      RETURN NEW;
    END IF;

    BEGIN
      v_role := nullif(current_setting('request.jwt.claims', true), '')::jsonb
  ->> 'role';
    EXCEPTION WHEN others THEN
      v_role := 'authenticated';
    END;

    IF v_role IS DISTINCT FROM 'authenticated' AND v_role IS DISTINCT FROM
  'anon' THEN
      RETURN NEW;
    END IF;

    IF TG_OP = 'INSERT' THEN
      NEW.verification_status := 'pending';
      NEW.linked_healer_slug  := NULL;
      NEW.created_at          := now();
    ELSE
      NEW.verification_status := OLD.verification_status;
      NEW.linked_healer_slug  := OLD.linked_healer_slug;
      NEW.id                  := OLD.id;
      NEW.created_at          := OLD.created_at;
    END IF;

    RETURN NEW;
  END;
  $$;


--
-- Name: FUNCTION user_profiles_protect_admin_fields(); Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON FUNCTION public.user_profiles_protect_admin_fields() IS 'Pins verification_status, linked_healer_slug, id and created_at against 
  ordinary API callers. Yields to app.claim_verified, which only 
  claim_healer_profile() can set.';


--
-- Name: admin_notes; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.admin_notes (
    id bigint NOT NULL,
    subject_user_id uuid NOT NULL,
    body text NOT NULL,
    created_by text,
    created_at timestamp with time zone DEFAULT now()
);


--
-- Name: TABLE admin_notes; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.admin_notes IS 'Internal admin notes about a user. 
  Never shown to the user. Readable and writable only by the service role.';


--
-- Name: COLUMN admin_notes.subject_user_id; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.admin_notes.subject_user_id IS 'The user the note is 
  about, not its author.';


--
-- Name: COLUMN admin_notes.created_by; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.admin_notes.created_by IS 'Admin display name from 
  ADMIN_NAME. There is no admin user table yet.';


--
-- Name: admin_notes_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.admin_notes_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: admin_notes_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.admin_notes_id_seq OWNED BY public.admin_notes.id;


--
-- Name: books; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.books (
    id bigint NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    title text,
    author text,
    amazon_url text,
    mock_cover_url text,
    subject_slugs text[] DEFAULT '{}'::text[],
    healer_slug text,
    goodreads_url text,
    worldofbooks_url text,
    description text,
    slug text
);


--
-- Name: TABLE books; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.books IS 'Table storing spiritual books and Amazon links.';


--
-- Name: books_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

ALTER TABLE public.books ALTER COLUMN id ADD GENERATED BY DEFAULT AS IDENTITY (
    SEQUENCE NAME public.books_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);


--
-- Name: broken_images; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.broken_images (
    id bigint NOT NULL,
    table_name text NOT NULL,
    record_id text NOT NULL,
    healer_slug text,
    title text,
    image_url text NOT NULL,
    status_code integer,
    failures integer DEFAULT 1 NOT NULL,
    first_seen_at timestamp with time zone DEFAULT now() NOT NULL,
    detected_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT broken_images_table_known CHECK ((table_name = ANY (ARRAY['books'::text, 'courses'::text, 'free_resources'::text, 'healers'::text])))
);


--
-- Name: TABLE broken_images; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.broken_images IS 'Images that failed their last audit. Service role only: no policies, as with healer_journeys and admin_notes.';


--
-- Name: COLUMN broken_images.record_id; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.broken_images.record_id IS 'TEXT, not bigint: books.id is a bigint but courses.id and free_resources.id are UUIDs. One column has to hold both.';


--
-- Name: COLUMN broken_images.healer_slug; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.broken_images.healer_slug IS 'Resolved at audit time so the admin can link straight to /admin/content/<slug>. Nullable because only books carry the slug directly; courses and free resources join healers through healer_id, and an orphaned row would otherwise block the insert.';


--
-- Name: COLUMN broken_images.failures; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.broken_images.failures IS 'Consecutive failed audits. A single network blip should not fill the inbox, so the queue is read with failures >= 2.';


--
-- Name: broken_images_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

ALTER TABLE public.broken_images ALTER COLUMN id ADD GENERATED ALWAYS AS IDENTITY (
    SEQUENCE NAME public.broken_images_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);


--
-- Name: courses; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.courses (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    healer_id bigint,
    title text NOT NULL,
    description text,
    course_url text,
    price text,
    image_url text,
    subject_slugs text[],
    created_at timestamp with time zone DEFAULT now(),
    product_type text DEFAULT 'course'::text,
    affiliate_status text DEFAULT 'none'::text,
    start_date date,
    end_date date,
    is_active boolean DEFAULT true,
    slug text
);


--
-- Name: TABLE courses; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.courses IS 'Public read. Writes are server-side only, 
  with the service role.';


--
-- Name: emotion_mappings; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.emotion_mappings (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    emotion text NOT NULL,
    subject_slug text NOT NULL,
    weight integer DEFAULT 1,
    created_at timestamp with time zone DEFAULT now()
);


--
-- Name: free_resources; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.free_resources (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    healer_id bigint,
    title text NOT NULL,
    description text,
    resource_url text NOT NULL,
    resource_type text DEFAULT 'meditation'::text,
    image_url text,
    subject_slugs text[],
    is_featured boolean DEFAULT false,
    created_at timestamp with time zone DEFAULT now(),
    start_date date,
    end_date date,
    is_active boolean DEFAULT true,
    slug text
);


--
-- Name: healer_journeys; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.healer_journeys (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    healer_slug text NOT NULL,
    status text DEFAULT 'running'::text NOT NULL,
    stop_reason text,
    started_at timestamp with time zone DEFAULT now() NOT NULL,
    email_1_sent_at timestamp with time zone,
    email_2_sent_at timestamp with time zone,
    email_3_sent_at timestamp with time zone,
    email_4_sent_at timestamp with time zone,
    email_5_sent_at timestamp with time zone,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT healer_journeys_status_known CHECK ((status = ANY (ARRAY['running'::text, 'paused'::text, 'stopped'::text])))
);


--
-- Name: TABLE healer_journeys; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.healer_journeys IS 'Outreach sequence to practitioners who have a listing but have not claimed it. Five emails at 0, 21, 42, 63 and 84 days. Service role only: there are no policies, as with admin_notes.';


--
-- Name: COLUMN healer_journeys.status; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.healer_journeys.status IS 'running, paused or stopped. Only running journeys are considered by the daily cron.';


--
-- Name: COLUMN healer_journeys.stop_reason; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.healer_journeys.stop_reason IS 'Why it ended. claimed and healer_removed are set automatically; sequence_complete when email 5 has gone; anything else is typed by an admin.';


--
-- Name: COLUMN healer_journeys.started_at; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.healer_journeys.started_at IS 'The clock every later email is measured from, NOT created_at. Days 21, 42, 63 and 84 are counted from here.';


--
-- Name: healers; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.healers (
    id bigint NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    name text,
    bio text,
    healer_slug text,
    is_famous boolean DEFAULT false,
    subject_slugs text[] NOT NULL,
    city text,
    ad_rank_score bigint DEFAULT '0'::bigint,
    availability_type text DEFAULT 'worldwide'::text,
    country text,
    image_url text,
    image_urls text[] DEFAULT '{}'::text[],
    contact_email text,
    contact_phone text,
    booking_url text,
    tier text DEFAULT 'local_hero'::text,
    website_url text,
    youtube_url text,
    instagram_url text,
    facebook_url text,
    twitter_url text,
    tiktok_url text,
    entity_type text DEFAULT 'individual'::text,
    birth_year integer,
    death_year integer
);


--
-- Name: TABLE healers; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.healers IS 'Public read. All writes go through the 
  service role on the server: the admin ingestion routes and the practitioner 
  dashboard. The anon key ships in every page bundle, so anything it may write, 
  any visitor may write.';


--
-- Name: healers_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

ALTER TABLE public.healers ALTER COLUMN id ADD GENERATED BY DEFAULT AS IDENTITY (
    SEQUENCE NAME public.healers_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);


--
-- Name: pending_user_types; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.pending_user_types (
    email text NOT NULL,
    user_type text DEFAULT 'explorer'::text NOT NULL,
    created_at timestamp with time zone DEFAULT now(),
    CONSTRAINT pending_user_types_email_is_lower CHECK ((email = lower(email))),
    CONSTRAINT pending_user_types_user_type_valid CHECK ((user_type = ANY (ARRAY['explorer'::text, 'practitioner'::text])))
);


--
-- Name: TABLE pending_user_types; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.pending_user_types IS 'Holds the practitioner/explorer
  choice between submitting an email and verifying it, so the answer survives a
  magic link click or a different device. Consumed and deleted once the profile
  row is created.';


--
-- Name: publisher_healers; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.publisher_healers (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    publisher_id uuid,
    healer_id bigint,
    created_at timestamp with time zone DEFAULT now()
);


--
-- Name: publishers; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.publishers (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    name text NOT NULL,
    slug text NOT NULL,
    description text,
    website_url text,
    logo_url text,
    founded_year integer,
    subject_slugs text[],
    created_at timestamp with time zone DEFAULT now()
);


--
-- Name: reviews; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.reviews (
    id bigint NOT NULL,
    user_id uuid NOT NULL,
    content_type text NOT NULL,
    content_slug text NOT NULL,
    rating smallint NOT NULL,
    body text,
    author_name text,
    created_at timestamp with time zone DEFAULT now(),
    author_healer_slug text,
    status text DEFAULT 'pending'::text NOT NULL,
    CONSTRAINT reviews_body_length CHECK (((body IS NULL) OR (char_length(body) <= 4000))),
    CONSTRAINT reviews_content_type_known CHECK ((content_type = ANY (ARRAY['healer'::text, 'publisher'::text, 'book'::text, 'video'::text, 'course'::text, 'free_resource'::text]))),
    CONSTRAINT reviews_rating_range CHECK (((rating >= 1) AND (rating <= 5))),
    CONSTRAINT reviews_status_known CHECK ((status = ANY (ARRAY['pending'::text, 'approved'::text, 'rejected'::text])))
);


--
-- Name: TABLE reviews; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.reviews IS 'Community reviews. One row per user per item. Public read, author-only write.';


--
-- Name: COLUMN reviews.content_type; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.reviews.content_type IS 'healer, publisher, book, video, course or free_resource. Same vocabulary as user_favourites.content_type. Every row in the courses table is course here, whatever its product_type: course, retreat, download, membership, meditation and podcast all share the /offerings/[slug] page.';


--
-- Name: COLUMN reviews.content_slug; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.reviews.content_slug IS 'The slug column of the table named by content_type, which is how every detail page resolves its item. ALWAYS a text slug, unlike user_favourites.content_slug, which is a slug for healers and publishers, a bigint for books and videos and a UUID for courses and free resources.';


--
-- Name: COLUMN reviews.rating; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.reviews.rating IS 'Whole stars, 1 to 5. No half stars.';


--
-- Name: COLUMN reviews.author_name; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.reviews.author_name IS 'Display name captured at submission. Denormalised on purpose: user_profiles is readable only by its owner, so a public list cannot join for it, and a review should keep the name it was posted under.';


--
-- Name: COLUMN reviews.author_healer_slug; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.reviews.author_healer_slug IS 'healers.healer_slug of the reviewer, when they are a practitioner with an approved claim. Captured from user_profiles.linked_healer_slug at submission and set by trigger, never by the client. Null for explorers and unclaimed practitioners, whose name renders as plain text. Where present the name links to /healers/[author_healer_slug].';


--
-- Name: COLUMN reviews.status; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.reviews.status IS 'pending, approved or rejected. Every review is moderated before it is public, explorers and practitioners alike. Admin-set only: the trigger below pins it against the author, and the read policy hides anything not approved.';


--
-- Name: reviews_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.reviews_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: reviews_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.reviews_id_seq OWNED BY public.reviews.id;


--
-- Name: subjects; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.subjects (
    id bigint NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    name text,
    slug text
);


--
-- Name: TABLE subjects; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.subjects IS 'Table storing spiritual categories and topics.';


--
-- Name: subjects_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

ALTER TABLE public.subjects ALTER COLUMN id ADD GENERATED BY DEFAULT AS IDENTITY (
    SEQUENCE NAME public.subjects_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);


--
-- Name: user_favourites; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.user_favourites (
    id bigint NOT NULL,
    user_id uuid NOT NULL,
    content_type text NOT NULL,
    content_slug text NOT NULL,
    created_at timestamp with time zone DEFAULT now()
);


--
-- Name: TABLE user_favourites; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.user_favourites IS 'Saved items per user. Migrated 
  from localStorage on first sign-in.';


--
-- Name: COLUMN user_favourites.content_type; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.user_favourites.content_type IS 'healer, publisher, 
  book, video, course or free_resource';


--
-- Name: COLUMN user_favourites.content_slug; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.user_favourites.content_slug IS 'Whatever identifier 
  the heart stored: a slug for healers, publishers and books, a numeric id for 
  videos, courses and free resources. Not always a slug despite the name.';


--
-- Name: user_favourites_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.user_favourites_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: user_favourites_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.user_favourites_id_seq OWNED BY public.user_favourites.id;


--
-- Name: videos; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.videos (
    id bigint NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    title text,
    platform_url text,
    subject_slugs text[] DEFAULT '{}'::text[],
    healer_slug text,
    slug text NOT NULL
);


--
-- Name: TABLE videos; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.videos IS 'Table storing spiritual videos and YouTube links.';


--
-- Name: videos_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

ALTER TABLE public.videos ALTER COLUMN id ADD GENERATED BY DEFAULT AS IDENTITY (
    SEQUENCE NAME public.videos_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);


--
-- Name: admin_notes id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.admin_notes ALTER COLUMN id SET DEFAULT nextval('public.admin_notes_id_seq'::regclass);


--
-- Name: reviews id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.reviews ALTER COLUMN id SET DEFAULT nextval('public.reviews_id_seq'::regclass);


--
-- Name: user_favourites id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_favourites ALTER COLUMN id SET DEFAULT nextval('public.user_favourites_id_seq'::regclass);


--
-- Name: admin_notes admin_notes_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.admin_notes
    ADD CONSTRAINT admin_notes_pkey PRIMARY KEY (id);


--
-- Name: books books_amazon_url_unique; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.books
    ADD CONSTRAINT books_amazon_url_unique UNIQUE (amazon_url);


--
-- Name: books books_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.books
    ADD CONSTRAINT books_pkey PRIMARY KEY (id);


--
-- Name: broken_images broken_images_one_per_record; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.broken_images
    ADD CONSTRAINT broken_images_one_per_record UNIQUE (table_name, record_id);


--
-- Name: broken_images broken_images_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.broken_images
    ADD CONSTRAINT broken_images_pkey PRIMARY KEY (id);


--
-- Name: courses courses_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.courses
    ADD CONSTRAINT courses_pkey PRIMARY KEY (id);


--
-- Name: courses courses_url_unique; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.courses
    ADD CONSTRAINT courses_url_unique UNIQUE (course_url);


--
-- Name: emotion_mappings emotion_mappings_emotion_subject_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.emotion_mappings
    ADD CONSTRAINT emotion_mappings_emotion_subject_key UNIQUE (emotion, subject_slug);


--
-- Name: emotion_mappings emotion_mappings_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.emotion_mappings
    ADD CONSTRAINT emotion_mappings_pkey PRIMARY KEY (id);


--
-- Name: free_resources free_resources_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.free_resources
    ADD CONSTRAINT free_resources_pkey PRIMARY KEY (id);


--
-- Name: free_resources free_resources_url_unique; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.free_resources
    ADD CONSTRAINT free_resources_url_unique UNIQUE (resource_url);


--
-- Name: healer_journeys healer_journeys_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.healer_journeys
    ADD CONSTRAINT healer_journeys_pkey PRIMARY KEY (id);


--
-- Name: healers healers_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.healers
    ADD CONSTRAINT healers_pkey PRIMARY KEY (id);


--
-- Name: healers healers_slug_unique; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.healers
    ADD CONSTRAINT healers_slug_unique UNIQUE (healer_slug);


--
-- Name: pending_user_types pending_user_types_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.pending_user_types
    ADD CONSTRAINT pending_user_types_pkey PRIMARY KEY (email);


--
-- Name: publisher_healers publisher_healers_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.publisher_healers
    ADD CONSTRAINT publisher_healers_pkey PRIMARY KEY (id);


--
-- Name: publisher_healers publisher_healers_publisher_id_healer_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.publisher_healers
    ADD CONSTRAINT publisher_healers_publisher_id_healer_id_key UNIQUE (publisher_id, healer_id);


--
-- Name: publishers publishers_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.publishers
    ADD CONSTRAINT publishers_pkey PRIMARY KEY (id);


--
-- Name: publishers publishers_slug_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.publishers
    ADD CONSTRAINT publishers_slug_key UNIQUE (slug);


--
-- Name: reviews reviews_one_per_item; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.reviews
    ADD CONSTRAINT reviews_one_per_item UNIQUE (user_id, content_type, content_slug);


--
-- Name: CONSTRAINT reviews_one_per_item ON reviews; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON CONSTRAINT reviews_one_per_item ON public.reviews IS 'One review per person per item. A second submission is an edit of the first, not a new row.';


--
-- Name: reviews reviews_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.reviews
    ADD CONSTRAINT reviews_pkey PRIMARY KEY (id);


--
-- Name: subjects subjects_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.subjects
    ADD CONSTRAINT subjects_pkey PRIMARY KEY (id);


--
-- Name: subjects unique_subject_slug; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.subjects
    ADD CONSTRAINT unique_subject_slug UNIQUE (slug);


--
-- Name: user_favourites user_favourites_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_favourites
    ADD CONSTRAINT user_favourites_pkey PRIMARY KEY (id);


--
-- Name: user_favourites user_favourites_unique; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_favourites
    ADD CONSTRAINT user_favourites_unique UNIQUE (user_id, content_type, content_slug);


--
-- Name: user_profiles user_profiles_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_profiles
    ADD CONSTRAINT user_profiles_pkey PRIMARY KEY (id);


--
-- Name: videos videos_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.videos
    ADD CONSTRAINT videos_pkey PRIMARY KEY (id);


--
-- Name: videos videos_platform_url_unique; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.videos
    ADD CONSTRAINT videos_platform_url_unique UNIQUE (platform_url);


--
-- Name: videos videos_slug_unique; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.videos
    ADD CONSTRAINT videos_slug_unique UNIQUE (slug);


--
-- Name: admin_notes_subject_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX admin_notes_subject_idx ON public.admin_notes USING btree (subject_user_id, created_at DESC);


--
-- Name: books_slug_unique; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX books_slug_unique ON public.books USING btree (slug);


--
-- Name: broken_images_detected_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX broken_images_detected_idx ON public.broken_images USING btree (detected_at DESC);


--
-- Name: broken_images_healer_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX broken_images_healer_idx ON public.broken_images USING btree (healer_slug);


--
-- Name: courses_slug_unique; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX courses_slug_unique ON public.courses USING btree (slug);


--
-- Name: emotion_mappings_emotion_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX emotion_mappings_emotion_idx ON public.emotion_mappings USING btree (emotion);


--
-- Name: free_resources_slug_unique; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX free_resources_slug_unique ON public.free_resources USING btree (slug);


--
-- Name: healer_journeys_due_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX healer_journeys_due_idx ON public.healer_journeys USING btree (status, started_at);


--
-- Name: healer_journeys_one_active_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX healer_journeys_one_active_idx ON public.healer_journeys USING btree (healer_slug) WHERE (status <> 'stopped'::text);


--
-- Name: pending_user_types_created_at_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX pending_user_types_created_at_idx ON public.pending_user_types USING btree (created_at);


--
-- Name: reviews_content_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX reviews_content_idx ON public.reviews USING btree (content_type, content_slug, status, created_at DESC);


--
-- Name: reviews_status_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX reviews_status_idx ON public.reviews USING btree (status, created_at DESC);


--
-- Name: reviews_user_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX reviews_user_idx ON public.reviews USING btree (user_id);


--
-- Name: user_favourites_user_id_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX user_favourites_user_id_idx ON public.user_favourites USING btree (user_id);


--
-- Name: reviews reviews_pin_author_trigger; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER reviews_pin_author_trigger BEFORE INSERT OR UPDATE ON public.reviews FOR EACH ROW EXECUTE FUNCTION public.reviews_pin_author();


--
-- Name: user_profiles user_profiles_protect_admin_fields; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER user_profiles_protect_admin_fields BEFORE INSERT OR UPDATE ON public.user_profiles FOR EACH ROW EXECUTE FUNCTION public.user_profiles_protect_admin_fields();


--
-- Name: admin_notes admin_notes_subject_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.admin_notes
    ADD CONSTRAINT admin_notes_subject_user_id_fkey FOREIGN KEY (subject_user_id) REFERENCES auth.users(id) ON DELETE CASCADE;


--
-- Name: courses courses_healer_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.courses
    ADD CONSTRAINT courses_healer_id_fkey FOREIGN KEY (healer_id) REFERENCES public.healers(id) ON DELETE CASCADE;


--
-- Name: free_resources free_resources_healer_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.free_resources
    ADD CONSTRAINT free_resources_healer_id_fkey FOREIGN KEY (healer_id) REFERENCES public.healers(id) ON DELETE CASCADE;


--
-- Name: healer_journeys healer_journeys_healer_slug_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.healer_journeys
    ADD CONSTRAINT healer_journeys_healer_slug_fkey FOREIGN KEY (healer_slug) REFERENCES public.healers(healer_slug) ON DELETE CASCADE;


--
-- Name: publisher_healers publisher_healers_healer_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.publisher_healers
    ADD CONSTRAINT publisher_healers_healer_id_fkey FOREIGN KEY (healer_id) REFERENCES public.healers(id) ON DELETE CASCADE;


--
-- Name: publisher_healers publisher_healers_publisher_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.publisher_healers
    ADD CONSTRAINT publisher_healers_publisher_id_fkey FOREIGN KEY (publisher_id) REFERENCES public.publishers(id) ON DELETE CASCADE;


--
-- Name: reviews reviews_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.reviews
    ADD CONSTRAINT reviews_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;


--
-- Name: user_favourites user_favourites_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_favourites
    ADD CONSTRAINT user_favourites_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;


--
-- Name: user_profiles user_profiles_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_profiles
    ADD CONSTRAINT user_profiles_id_fkey FOREIGN KEY (id) REFERENCES auth.users(id) ON DELETE CASCADE;


--
-- Name: pending_user_types Anyone can change a pending choice; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Anyone can change a pending choice" ON public.pending_user_types FOR UPDATE TO authenticated, anon USING (true) WITH CHECK (true);


--
-- Name: pending_user_types Anyone can record a pending choice; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Anyone can record a pending choice" ON public.pending_user_types FOR INSERT TO authenticated, anon WITH CHECK (true);


--
-- Name: emotion_mappings Emotion mappings viewable by everyone; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Emotion mappings viewable by everyone" ON public.emotion_mappings FOR SELECT USING (true);


--
-- Name: reviews Public read approved reviews; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Public read approved reviews" ON public.reviews FOR SELECT TO authenticated, anon USING ((status = 'approved'::text));


--
-- Name: books Public read books; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Public read books" ON public.books FOR SELECT TO authenticated, anon USING (true);


--
-- Name: courses Public read courses; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Public read courses" ON public.courses FOR SELECT TO authenticated, anon USING (true);


--
-- Name: free_resources Public read free_resources; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Public read free_resources" ON public.free_resources FOR SELECT TO authenticated, anon USING (true);


--
-- Name: healers Public read healers; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Public read healers" ON public.healers FOR SELECT TO authenticated, anon USING (true);


--
-- Name: publisher_healers Public read publisher_healers; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Public read publisher_healers" ON public.publisher_healers FOR SELECT TO authenticated, anon USING (true);


--
-- Name: publishers Public read publishers; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Public read publishers" ON public.publishers FOR SELECT TO authenticated, anon USING (true);


--
-- Name: subjects Public read subjects; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Public read subjects" ON public.subjects FOR SELECT TO authenticated, anon USING (true);


--
-- Name: videos Public read videos; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Public read videos" ON public.videos FOR SELECT TO authenticated, anon USING (true);


--
-- Name: pending_user_types Users can clear their own pending choice; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can clear their own pending choice" ON public.pending_user_types FOR DELETE TO authenticated USING ((lower((auth.jwt() ->> 'email'::text)) = email));


--
-- Name: user_favourites Users can delete own favourites; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can delete own favourites" ON public.user_favourites FOR DELETE USING ((auth.uid() = user_id));


--
-- Name: reviews Users can delete own reviews; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can delete own reviews" ON public.reviews FOR DELETE TO authenticated USING ((auth.uid() = user_id));


--
-- Name: user_favourites Users can insert own favourites; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can insert own favourites" ON public.user_favourites FOR INSERT WITH CHECK ((auth.uid() = user_id));


--
-- Name: user_profiles Users can insert own profile; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can insert own profile" ON public.user_profiles FOR INSERT WITH CHECK ((auth.uid() = id));


--
-- Name: reviews Users can insert own reviews; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can insert own reviews" ON public.reviews FOR INSERT TO authenticated WITH CHECK ((auth.uid() = user_id));


--
-- Name: user_favourites Users can read own favourites; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can read own favourites" ON public.user_favourites FOR SELECT USING ((auth.uid() = user_id));


--
-- Name: user_profiles Users can read own profile; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can read own profile" ON public.user_profiles FOR SELECT USING ((auth.uid() = id));


--
-- Name: reviews Users can read own reviews; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can read own reviews" ON public.reviews FOR SELECT TO authenticated USING ((auth.uid() = user_id));


--
-- Name: pending_user_types Users can read their own pending choice; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can read their own pending choice" ON public.pending_user_types FOR SELECT TO authenticated USING ((lower((auth.jwt() ->> 'email'::text)) = email));


--
-- Name: user_profiles Users can update own profile; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can update own profile" ON public.user_profiles FOR UPDATE USING ((auth.uid() = id));


--
-- Name: reviews Users can update own reviews; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can update own reviews" ON public.reviews FOR UPDATE TO authenticated USING ((auth.uid() = user_id)) WITH CHECK ((auth.uid() = user_id));


--
-- Name: admin_notes; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.admin_notes ENABLE ROW LEVEL SECURITY;

--
-- Name: books; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.books ENABLE ROW LEVEL SECURITY;

--
-- Name: broken_images; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.broken_images ENABLE ROW LEVEL SECURITY;

--
-- Name: courses; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.courses ENABLE ROW LEVEL SECURITY;

--
-- Name: emotion_mappings; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.emotion_mappings ENABLE ROW LEVEL SECURITY;

--
-- Name: free_resources; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.free_resources ENABLE ROW LEVEL SECURITY;

--
-- Name: healer_journeys; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.healer_journeys ENABLE ROW LEVEL SECURITY;

--
-- Name: healers; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.healers ENABLE ROW LEVEL SECURITY;

--
-- Name: pending_user_types; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.pending_user_types ENABLE ROW LEVEL SECURITY;

--
-- Name: publisher_healers; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.publisher_healers ENABLE ROW LEVEL SECURITY;

--
-- Name: publishers; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.publishers ENABLE ROW LEVEL SECURITY;

--
-- Name: reviews; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.reviews ENABLE ROW LEVEL SECURITY;

--
-- Name: subjects; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.subjects ENABLE ROW LEVEL SECURITY;

--
-- Name: user_favourites; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.user_favourites ENABLE ROW LEVEL SECURITY;

--
-- Name: user_profiles; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.user_profiles ENABLE ROW LEVEL SECURITY;

--
-- Name: videos; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.videos ENABLE ROW LEVEL SECURITY;

--
-- Name: SCHEMA public; Type: ACL; Schema: -; Owner: -
--

GRANT USAGE ON SCHEMA public TO postgres;
GRANT USAGE ON SCHEMA public TO anon;
GRANT USAGE ON SCHEMA public TO authenticated;
GRANT USAGE ON SCHEMA public TO service_role;


--
-- Name: TABLE user_profiles; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON TABLE public.user_profiles TO anon;
GRANT ALL ON TABLE public.user_profiles TO authenticated;
GRANT ALL ON TABLE public.user_profiles TO service_role;


--
-- Name: FUNCTION claim_healer_profile(p_slug text); Type: ACL; Schema: public; Owner: -
--

REVOKE ALL ON FUNCTION public.claim_healer_profile(p_slug text) FROM PUBLIC;
GRANT ALL ON FUNCTION public.claim_healer_profile(p_slug text) TO authenticated;
GRANT ALL ON FUNCTION public.claim_healer_profile(p_slug text) TO service_role;


--
-- Name: FUNCTION reviews_pin_author(); Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON FUNCTION public.reviews_pin_author() TO anon;
GRANT ALL ON FUNCTION public.reviews_pin_author() TO authenticated;
GRANT ALL ON FUNCTION public.reviews_pin_author() TO service_role;


--
-- Name: FUNCTION user_profiles_protect_admin_fields(); Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON FUNCTION public.user_profiles_protect_admin_fields() TO anon;
GRANT ALL ON FUNCTION public.user_profiles_protect_admin_fields() TO authenticated;
GRANT ALL ON FUNCTION public.user_profiles_protect_admin_fields() TO service_role;


--
-- Name: TABLE admin_notes; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON TABLE public.admin_notes TO anon;
GRANT ALL ON TABLE public.admin_notes TO authenticated;
GRANT ALL ON TABLE public.admin_notes TO service_role;


--
-- Name: SEQUENCE admin_notes_id_seq; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON SEQUENCE public.admin_notes_id_seq TO anon;
GRANT ALL ON SEQUENCE public.admin_notes_id_seq TO authenticated;
GRANT ALL ON SEQUENCE public.admin_notes_id_seq TO service_role;


--
-- Name: TABLE books; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON TABLE public.books TO anon;
GRANT ALL ON TABLE public.books TO authenticated;
GRANT ALL ON TABLE public.books TO service_role;


--
-- Name: SEQUENCE books_id_seq; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON SEQUENCE public.books_id_seq TO anon;
GRANT ALL ON SEQUENCE public.books_id_seq TO authenticated;
GRANT ALL ON SEQUENCE public.books_id_seq TO service_role;


--
-- Name: TABLE broken_images; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON TABLE public.broken_images TO anon;
GRANT ALL ON TABLE public.broken_images TO authenticated;
GRANT ALL ON TABLE public.broken_images TO service_role;


--
-- Name: SEQUENCE broken_images_id_seq; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON SEQUENCE public.broken_images_id_seq TO anon;
GRANT ALL ON SEQUENCE public.broken_images_id_seq TO authenticated;
GRANT ALL ON SEQUENCE public.broken_images_id_seq TO service_role;


--
-- Name: TABLE courses; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON TABLE public.courses TO anon;
GRANT ALL ON TABLE public.courses TO authenticated;
GRANT ALL ON TABLE public.courses TO service_role;


--
-- Name: TABLE emotion_mappings; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON TABLE public.emotion_mappings TO anon;
GRANT ALL ON TABLE public.emotion_mappings TO authenticated;
GRANT ALL ON TABLE public.emotion_mappings TO service_role;


--
-- Name: TABLE free_resources; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON TABLE public.free_resources TO anon;
GRANT ALL ON TABLE public.free_resources TO authenticated;
GRANT ALL ON TABLE public.free_resources TO service_role;


--
-- Name: TABLE healer_journeys; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON TABLE public.healer_journeys TO anon;
GRANT ALL ON TABLE public.healer_journeys TO authenticated;
GRANT ALL ON TABLE public.healer_journeys TO service_role;


--
-- Name: TABLE healers; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON TABLE public.healers TO anon;
GRANT ALL ON TABLE public.healers TO authenticated;
GRANT ALL ON TABLE public.healers TO service_role;


--
-- Name: SEQUENCE healers_id_seq; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON SEQUENCE public.healers_id_seq TO anon;
GRANT ALL ON SEQUENCE public.healers_id_seq TO authenticated;
GRANT ALL ON SEQUENCE public.healers_id_seq TO service_role;


--
-- Name: TABLE pending_user_types; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON TABLE public.pending_user_types TO anon;
GRANT ALL ON TABLE public.pending_user_types TO authenticated;
GRANT ALL ON TABLE public.pending_user_types TO service_role;


--
-- Name: TABLE publisher_healers; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON TABLE public.publisher_healers TO anon;
GRANT ALL ON TABLE public.publisher_healers TO authenticated;
GRANT ALL ON TABLE public.publisher_healers TO service_role;


--
-- Name: TABLE publishers; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON TABLE public.publishers TO anon;
GRANT ALL ON TABLE public.publishers TO authenticated;
GRANT ALL ON TABLE public.publishers TO service_role;


--
-- Name: TABLE reviews; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON TABLE public.reviews TO anon;
GRANT ALL ON TABLE public.reviews TO authenticated;
GRANT ALL ON TABLE public.reviews TO service_role;


--
-- Name: SEQUENCE reviews_id_seq; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON SEQUENCE public.reviews_id_seq TO anon;
GRANT ALL ON SEQUENCE public.reviews_id_seq TO authenticated;
GRANT ALL ON SEQUENCE public.reviews_id_seq TO service_role;


--
-- Name: TABLE subjects; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON TABLE public.subjects TO anon;
GRANT ALL ON TABLE public.subjects TO authenticated;
GRANT ALL ON TABLE public.subjects TO service_role;


--
-- Name: SEQUENCE subjects_id_seq; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON SEQUENCE public.subjects_id_seq TO anon;
GRANT ALL ON SEQUENCE public.subjects_id_seq TO authenticated;
GRANT ALL ON SEQUENCE public.subjects_id_seq TO service_role;


--
-- Name: TABLE user_favourites; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON TABLE public.user_favourites TO anon;
GRANT ALL ON TABLE public.user_favourites TO authenticated;
GRANT ALL ON TABLE public.user_favourites TO service_role;


--
-- Name: SEQUENCE user_favourites_id_seq; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON SEQUENCE public.user_favourites_id_seq TO anon;
GRANT ALL ON SEQUENCE public.user_favourites_id_seq TO authenticated;
GRANT ALL ON SEQUENCE public.user_favourites_id_seq TO service_role;


--
-- Name: TABLE videos; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON TABLE public.videos TO anon;
GRANT ALL ON TABLE public.videos TO authenticated;
GRANT ALL ON TABLE public.videos TO service_role;


--
-- Name: SEQUENCE videos_id_seq; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON SEQUENCE public.videos_id_seq TO anon;
GRANT ALL ON SEQUENCE public.videos_id_seq TO authenticated;
GRANT ALL ON SEQUENCE public.videos_id_seq TO service_role;


--
-- Name: DEFAULT PRIVILEGES FOR SEQUENCES; Type: DEFAULT ACL; Schema: public; Owner: -
--

ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public GRANT ALL ON SEQUENCES TO postgres;
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public GRANT ALL ON SEQUENCES TO anon;
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public GRANT ALL ON SEQUENCES TO authenticated;
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public GRANT ALL ON SEQUENCES TO service_role;


--
-- Name: DEFAULT PRIVILEGES FOR SEQUENCES; Type: DEFAULT ACL; Schema: public; Owner: -
--



--
-- Name: DEFAULT PRIVILEGES FOR FUNCTIONS; Type: DEFAULT ACL; Schema: public; Owner: -
--

ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public GRANT ALL ON FUNCTIONS TO postgres;
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public GRANT ALL ON FUNCTIONS TO anon;
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public GRANT ALL ON FUNCTIONS TO authenticated;
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public GRANT ALL ON FUNCTIONS TO service_role;


--
-- Name: DEFAULT PRIVILEGES FOR FUNCTIONS; Type: DEFAULT ACL; Schema: public; Owner: -
--



--
-- Name: DEFAULT PRIVILEGES FOR TABLES; Type: DEFAULT ACL; Schema: public; Owner: -
--

ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public GRANT ALL ON TABLES TO postgres;
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public GRANT ALL ON TABLES TO anon;
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public GRANT ALL ON TABLES TO authenticated;
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public GRANT ALL ON TABLES TO service_role;


--
-- Name: DEFAULT PRIVILEGES FOR TABLES; Type: DEFAULT ACL; Schema: public; Owner: -
--



--
-- PostgreSQL database dump complete
--


-- ═════════════════════════════════════════════════════════════════════════
-- STORAGE — the practitioner-images bucket and its policies on
-- storage.objects. Outside `public`, so not in the pg_dump above; generated
-- read-only from storage.buckets and pg_policies on 9 Oct 2026.
--
-- The policy names carry the suffixes the dashboard gave them. Note that
-- "Practitioners can delete own images eclhmz_1" is a SELECT policy despite
-- its name — that is how it was created; it lets a practitioner list their
-- own folder.
-- ═════════════════════════════════════════════════════════════════════════

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types) VALUES ('practitioner-images', 'practitioner-images', true, NULL, NULL) ON CONFLICT (id) DO NOTHING;
DROP POLICY IF EXISTS "Anyone can view practitioner images eclhmz_0" ON storage.objects;
CREATE POLICY "Anyone can view practitioner images eclhmz_0" ON storage.objects AS PERMISSIVE FOR SELECT TO anon
  USING ((bucket_id = 'practitioner-images'::text));
DROP POLICY IF EXISTS "Practitioners can delete own images eclhmz_0" ON storage.objects;
CREATE POLICY "Practitioners can delete own images eclhmz_0" ON storage.objects AS PERMISSIVE FOR DELETE TO authenticated
  USING (((bucket_id = 'practitioner-images'::text) AND ((storage.foldername(name))[1] = (auth.uid())::text)));
DROP POLICY IF EXISTS "Practitioners can delete own images eclhmz_1" ON storage.objects;
CREATE POLICY "Practitioners can delete own images eclhmz_1" ON storage.objects AS PERMISSIVE FOR SELECT TO authenticated
  USING (((bucket_id = 'practitioner-images'::text) AND ((storage.foldername(name))[1] = (auth.uid())::text)));
DROP POLICY IF EXISTS "Practitioners can upload images eclhmz_0" ON storage.objects;
CREATE POLICY "Practitioners can upload images eclhmz_0" ON storage.objects AS PERMISSIVE FOR INSERT TO authenticated
  WITH CHECK (((bucket_id = 'practitioner-images'::text) AND ((storage.foldername(name))[1] = (auth.uid())::text)));
