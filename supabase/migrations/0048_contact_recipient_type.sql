-- 0048 — What kind of inbox a contact email is, and where a publisher's is
-- published (owner, 11 Nov 2026; docs/email-copy-2026-11-11-shared-journey.md:
-- "Record the source and recipient type for the sending eligibility process").
--
--   1. healers.contact_recipient_type and publishers.contact_recipient_type —
--      whose inbox the published address is. A public address alone is not
--      consent; this is what the eligibility check (web/utils/journey.js →
--      outreachEligibility) and the solicitor's answer are applied to.
--   2. publishers.contact_email_source — the page where a publisher's email is
--      published, as healers have had since 0039. Never guessed.
--   3. healer_journeys.contact_recipient_type and contact_email_source — what
--      they were when the journey started, kept with the journey as the
--      record of why it was eligible, whatever the listing says later.
--
-- The values (one set, checked on all three tables):
--   business           a published inbox of a business, not a person's own:
--                      info@, hello@, studio@, bookings@
--   organisation       a published inbox of a charity, religious body,
--                      community, school or other non-profit organisation
--   personal_business  a named person's address at the business or
--                      organisation, published by it: jane@studio.com
--   personal           a private individual's own address, even if they
--                      publish it for their work: a Gmail of a sole trader
--   unknown            not yet decided
-- NULL means nobody has looked yet.
--
-- healers and publishers are public-read, as before: these are facts about a
-- published address, not private data. healer_journeys stays service role
-- only. No policy changes.
--
-- Dev first, then live. Run once; it's safe to run again. Check row at the end.


-- 1. Recipient type --------------------------------------------------------

ALTER TABLE public.healers ADD COLUMN IF NOT EXISTS contact_recipient_type TEXT;
ALTER TABLE public.publishers ADD COLUMN IF NOT EXISTS contact_recipient_type TEXT;

ALTER TABLE public.healers DROP CONSTRAINT IF EXISTS healers_contact_recipient_type_known;
ALTER TABLE public.healers ADD CONSTRAINT healers_contact_recipient_type_known
  CHECK (contact_recipient_type IN ('business', 'organisation', 'personal_business', 'personal', 'unknown'));

ALTER TABLE public.publishers DROP CONSTRAINT IF EXISTS publishers_contact_recipient_type_known;
ALTER TABLE public.publishers ADD CONSTRAINT publishers_contact_recipient_type_known
  CHECK (contact_recipient_type IN ('business', 'organisation', 'personal_business', 'personal', 'unknown'));

COMMENT ON COLUMN public.healers.contact_recipient_type IS
  'Whose inbox contact_email is (0048): business (a business''s own inbox, info@), organisation (a charity''s, religious body''s, community''s or school''s inbox), personal_business (a named person''s address at the business, published by it), personal (a private individual''s own address), unknown. NULL: not yet looked at. Read by the outreach eligibility check; a public address alone is not consent.';
COMMENT ON COLUMN public.publishers.contact_recipient_type IS
  'Whose inbox contact_email is (0048), as healers.contact_recipient_type: business, organisation, personal_business, personal or unknown. NULL: not yet looked at.';


-- 2. Where a publisher's email is published --------------------------------

ALTER TABLE public.publishers ADD COLUMN IF NOT EXISTS contact_email_source TEXT;

COMMENT ON COLUMN public.publishers.contact_email_source IS
  'URL of the page where contact_email is published (0048; as healers since 0039). Never guessed or constructed.';


-- 3. What the journey was started on -------------------------------------

ALTER TABLE public.healer_journeys ADD COLUMN IF NOT EXISTS contact_recipient_type TEXT;
ALTER TABLE public.healer_journeys ADD COLUMN IF NOT EXISTS contact_email_source TEXT;

ALTER TABLE public.healer_journeys DROP CONSTRAINT IF EXISTS healer_journeys_contact_recipient_type_known;
ALTER TABLE public.healer_journeys ADD CONSTRAINT healer_journeys_contact_recipient_type_known
  CHECK (contact_recipient_type IN ('business', 'organisation', 'personal_business', 'personal', 'unknown'));

COMMENT ON COLUMN public.healer_journeys.contact_recipient_type IS
  'The listing''s contact_recipient_type when the journey started (0048): the record of why it was eligible.';
COMMENT ON COLUMN public.healer_journeys.contact_email_source IS
  'The page the address was published on when the journey started (0048).';


-- Check -------------------------------------------------------------------
-- new_columns 5; then the emails that still need their type (every one, as
-- nothing has a type yet) and the publishers' emails without a source.

SELECT
  (SELECT count(*) FROM information_schema.columns
    WHERE table_schema = 'public'
      AND (table_name, column_name) IN (
        ('healers', 'contact_recipient_type'),
        ('publishers', 'contact_recipient_type'),
        ('publishers', 'contact_email_source'),
        ('healer_journeys', 'contact_recipient_type'),
        ('healer_journeys', 'contact_email_source'))) AS new_columns,
  (SELECT count(*) FROM public.healers
    WHERE coalesce(contact_email, '') <> '' AND contact_recipient_type IS NULL) AS healer_emails_without_type,
  (SELECT count(*) FROM public.healers
    WHERE coalesce(contact_email, '') <> '' AND coalesce(contact_email_source, '') = '') AS healer_emails_without_source,
  (SELECT count(*) FROM public.publishers
    WHERE coalesce(contact_email, '') <> '' AND coalesce(contact_email_source, '') = '') AS publisher_emails_without_source;
