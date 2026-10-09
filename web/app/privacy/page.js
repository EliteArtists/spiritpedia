import { buildMetadata } from '@/utils/seo';
import { A, ADDRESS, ENTITY, LAST_UPDATED, LegalPage, List, Mail, Rows, Section, Sub } from '@/components/LegalPage';
import CookieSettingsLink from '@/components/CookieSettingsLink';

// Privacy Policy. Every technical claim here was checked against the codebase
// on 9 October 2026 — see legal-draft.md (not committed). If you change how the
// site handles data — a new provider, search logging, a cookie, the YouTube
// embed — change this page in the same commit.
export const metadata = buildMetadata({
  title: 'Privacy Policy',
  description: 'What personal information Spiritpedia collects, why, and what you can do about it.',
  path: '/privacy',
});

export default function PrivacyPage() {
  return (
    <LegalPage
      title="Privacy Policy"
      updated={LAST_UPDATED}
      intro={
        <p>
          This policy explains what personal information Spiritpedia — the website and apps —
          collects, why, and what you can do about it. We collect as little as we can, we never
          sell it, and we don&apos;t use it for advertising.
        </p>
      }
    >
      <Section title="1. Who is responsible for your data">
        <p>
          Spiritpedia is run by {ENTITY}, {ADDRESS}, who is the &ldquo;controller&rdquo; of your
          personal data under UK and EU data protection law. Contact: <Mail />.
        </p>
      </Section>

      <Section title="2. What we collect">
        <Sub>When you browse</Sub>
        <List>
          <li>
            <strong className="text-white">Analytics</strong> — only if you accept analytics
            cookies: pages visited, approximate location (country/city), device and browser type,
            collected through Google Analytics.
          </li>
          <li>
            <strong className="text-white">Technical data</strong> — like every website, our
            hosting provider records basic request information (such as IP address and browser) to
            keep Spiritpedia running and secure. Some images, such as book covers and video
            thumbnails, load from other sites (for example Amazon, Google and YouTube), which
            receive the same basic information your browser sends to any site.
          </li>
          <li>
            <strong className="text-white">Saved items</strong> — the teachers, books, videos and
            other things you save are stored in your own browser. If you have an account, we also
            keep a copy with your account when you sign in.
          </li>
          <li>
            <strong className="text-white">The emotional search</strong> — we don&apos;t save what
            you type into the search bar, and it isn&apos;t linked to you or your account. To find
            matches, each search is sent to our database provider, whose short-lived technical
            logs can briefly include it. If what you type matches one of our crisis phrases, the
            search stops in your browser: nothing more is sent, and we show you where to find
            support instead.
          </li>
        </List>

        <Sub>When you create an account</Sub>
        <List>
          <li>Your email address and whether you joined as an explorer or a practitioner.</li>
          <li>
            While you&apos;re signing up, we briefly hold your email address and that choice, so it
            survives if you open your code on another device. It is deleted once you finish
            signing up.
          </li>
          <li>
            Your saved items and any reviews you write. A review is shown publicly with the name
            you post it under.
          </li>
          <li>Basic sign-in records (for example, when you last signed in).</li>
        </List>

        <Sub>When you apply or are listed as a practitioner</Sub>
        <List>
          <li>
            What you give us: name, modality, bio, location, website and social links, images,
            subjects and contact details. Most of this appears on your public profile — that is
            its purpose.
          </li>
          <li>
            Internal notes we make while reviewing your application or profile. These are never
            shown publicly.
          </li>
        </List>

        <p>
          <strong className="text-white">If you are a teacher we feature.</strong> Many profiles
          are of established teachers we feature on our own initiative. These are built from
          information you or your representatives have already made public: your name, biography,
          images, public social links, public booking or contact details and, for local
          practitioners, the town or city where you work. We may also email you about your profile
          and invite you to claim it. See section 7 for how to correct, claim or remove it.
        </p>

        <p>
          <strong className="text-white">When you contact us</strong> — your message and email
          address.
        </p>
      </Section>

      <Section title="3. Why we use it, and our legal basis">
        <Rows
          head={['What we do', 'Legal basis']}
          rows={[
            [
              'Run your account, sign you in, save your items, publish your reviews and profile',
              'Performing our agreement with you',
            ],
            ['Analytics to understand how Spiritpedia is used', 'Your consent, through the cookie banner'],
            [
              'Feature established teachers and invite them to claim their profile',
              'Our legitimate interest in building a useful directory — balanced against your rights, and you can object at any time',
            ],
            ['Keep Spiritpedia secure, prevent misuse and moderate content', 'Our legitimate interests'],
            [
              'Send service emails (sign-in codes, application and review updates)',
              'Performing our agreement with you',
            ],
            ['Keep records the law requires', 'Legal obligation'],
          ]}
        />
        <p>
          We don&apos;t sell personal data, show advertising, or use your data to build marketing
          profiles.
        </p>
      </Section>

      <Section title="4. Who we share it with">
        <p>
          We use a small number of trusted providers who process data on our behalf, under
          contracts that protect it:
        </p>
        <List>
          <li>
            <strong className="text-white">Supabase</strong> — our database, accounts and sign-in,
            including the codes we email you. Your data is stored in the EU (Ireland).
          </li>
          <li>
            <strong className="text-white">Vercel</strong> — hosts Spiritpedia. Pages are generated
            on its servers in the United States.
          </li>
          <li>
            <strong className="text-white">Resend</strong> — delivers the emails we send you, from
            its EU region.
          </li>
          <li>
            <strong className="text-white">Google</strong> — Google Analytics, only with your
            consent, and Google Workspace, which holds the emails you send us.
          </li>
        </List>
        <p>
          When you choose to interact with other services through Spiritpedia, they handle your
          data under their own privacy policies:
        </p>
        <List>
          <li>
            <strong className="text-white">YouTube</strong> — videos play in YouTube&apos;s
            privacy-enhanced mode. Opening a video page loads the player, which receives the same
            basic information your browser sends to any site, but YouTube doesn&apos;t store
            cookies on your device unless you play the video.
          </li>
          <li>
            <strong className="text-white">Amazon, Goodreads, World of Books and course providers</strong>{' '}
            — when you follow a link to them.
          </li>
        </List>
        <p>We may also disclose information if the law requires it.</p>
      </Section>

      <Section title="5. International transfers">
        <p>
          Our database is in the EU, but some of our providers are based in, or use servers in, the
          United States. Where personal data leaves the UK or EU, it is protected by the safeguards
          the law requires, such as the UK International Data Transfer Agreement, the EU Standard
          Contractual Clauses or the EU–US Data Privacy Framework.
        </p>
      </Section>

      <Section title="6. How long we keep it">
        <List>
          <li>
            Account data, saved items and reviews — until you delete your account, or ask us to
            delete them.
          </li>
          <li>
            Practitioner profiles — while the profile is listed; declined applications for 12
            months.
          </li>
          <li>
            Unfinished sign-ups — the email address and choice you entered, until you finish
            signing up or ask us to remove it.
          </li>
          <li>Analytics — 2 months.</li>
          <li>Emails to us — as long as needed to deal with them.</li>
        </List>
      </Section>

      <Section title="7. Your rights">
        <p>You can ask us to:</p>
        <List>
          <li>give you a copy of your data</li>
          <li>correct anything that&apos;s wrong</li>
          <li>delete your data</li>
          <li>restrict or object to how we use it — including objecting to being featured as a teacher</li>
          <li>send your data to you or another service in a portable format</li>
          <li>withdraw consent, for example to analytics cookies, at any time</li>
        </List>
        <p>
          Email <Mail />. We&apos;ll respond within one month. If you&apos;re a featured teacher and
          would like your profile corrected, claimed or removed, the same address works.
        </p>
        <p>
          If you&apos;re unhappy with how we&apos;ve handled your data, you can complain to the UK
          Information Commissioner&apos;s Office (<A href="https://ico.org.uk">ico.org.uk</A>) or
          to the data protection authority where you live — in Portugal, for example, the CNPD (
          <A href="https://www.cnpd.pt">cnpd.pt</A>). We&apos;d appreciate the chance to put it
          right first.
        </p>
      </Section>

      <Section title="8. Cookies and similar storage">
        <p>
          Spiritpedia sets no cookies of its own for visitors. Signing in, your cookie choice and
          your saved items use your browser&apos;s own storage. Google Analytics sets cookies only
          if you accept them.
        </p>
        <Rows
          head={['Type', 'What it does', 'Needs your consent?']}
          rows={[
            [
              'Essential (browser storage)',
              'Keeps you signed in, remembers your cookie choice, and remembers your explorer or practitioner choice while you sign up',
              'No — Spiritpedia can’t work without it',
            ],
            [
              'Saved items (browser storage)',
              'Stores the things you save, in your own browser',
              'No — only used when you save something',
            ],
            [
              'Analytics (Google Analytics cookies)',
              'Helps us understand how Spiritpedia is used',
              'Yes — only set if you accept',
            ],
            [
              'YouTube (video pages)',
              'The embedded video player, in YouTube’s privacy-enhanced mode',
              'Set by YouTube only if you play a video, under its own policy',
            ],
          ]}
        />
        <p>
          You can change your choice at any time through <CookieSettingsLink /> at the foot of
          every page, or by clearing cookies and site data in your browser.
        </p>
      </Section>

      <Section title="9. Age">
        <p>
          Spiritpedia accounts are for people aged 16 and over. If you believe a younger person has
          given us their details, please let us know and we&apos;ll delete them.
        </p>
      </Section>

      <Section title="10. Keeping data safe">
        <p>
          We limit who and what can change data on Spiritpedia, keep account and administrative
          information protected on the server side, and use reputable providers. No system is
          perfectly secure, but we take reasonable steps to protect your information.
        </p>
      </Section>

      <Section title="11. Changes to this policy">
        <p>
          We&apos;ll update this page when how we handle data changes, and change the date at the
          top. If a change is significant, we&apos;ll tell account holders by email.
        </p>
      </Section>

      <Section title="12. Contact">
        <p>
          Questions or requests about your data: <Mail />. The rules for using Spiritpedia are in
          our <A href="/terms">Terms of Use</A>.
        </p>
      </Section>
    </LegalPage>
  );
}
