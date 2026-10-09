import { buildMetadata } from '@/utils/seo';
import { A, ADDRESS, ENTITY, LAST_UPDATED, LegalPage, List, Mail, Section } from '@/components/LegalPage';

// Terms of Use. Wording reviewed against the codebase on 9 October 2026 — see
// legal-draft.md (not committed) for the working copy and what was corrected.
export const metadata = buildMetadata({
  title: 'Terms of Use',
  description: 'The terms for using the Spiritpedia website and apps.',
  path: '/terms',
});

export default function TermsPage() {
  return (
    <LegalPage title="Terms of Use" updated={LAST_UPDATED}>
      <Section title="1. Who we are">
        <p>
          Spiritpedia is run by {ENTITY}, {ADDRESS}. You can reach us at <Mail />.
        </p>
        <p>
          These terms cover the Spiritpedia website (spiritpedia.co) and Spiritpedia apps —
          together, &ldquo;Spiritpedia&rdquo;. By using Spiritpedia you agree to them. If you
          don&apos;t agree, please don&apos;t use it.
        </p>
      </Section>

      <Section title="2. What Spiritpedia is — and isn’t">
        <p>
          Spiritpedia is a curated place to discover spiritual teachers, books, videos, courses
          and practices, starting from how you feel.
        </p>
        <p>
          It offers spiritual education and inspiration. It is not medical, psychological or
          professional advice, diagnosis or treatment, and nothing here replaces the care of a
          doctor, therapist or other qualified professional. Practices such as breathwork, fasting
          or plant medicine can carry real risks; please take advice before trying anything that
          may affect your health.
        </p>
        <p>
          If you are in crisis or thinking about harming yourself, please contact local emergency
          services or find free, confidential support at{' '}
          <A href="https://findahelpline.com">findahelpline.com</A>.
        </p>
      </Section>

      <Section title="3. Who can use Spiritpedia">
        <p>Anyone can browse. To create an account you must be at least 16 years old.</p>
      </Section>

      <Section title="4. Your account">
        <p>
          You sign in with a one-time code sent to your email address — there is no password. Keep
          access to your email secure, because anyone who can read it can sign in as you. Your
          account is for you alone.
        </p>
        <p>
          We may suspend or close an account that breaks these terms, or that we reasonably
          believe puts other people or Spiritpedia at risk.
        </p>
      </Section>

      <Section title="5. Practitioners and teachers">
        <p>
          <strong className="text-white">Applying as a practitioner.</strong> We review every
          application and may approve, decline or ask for changes. You must give accurate
          information about yourself and your work, and keep it up to date. Once you&apos;re
          approved, changes you make to your profile appear straight away; we may edit or remove
          anything that breaks these terms.
        </p>
        <p>
          <strong className="text-white">Teachers we feature.</strong> Many profiles on
          Spiritpedia are of well-known teachers, built from publicly available information about
          their work. If you are featured and would like something corrected, or would like to
          claim or remove your profile, email <Mail />.
        </p>
        <p>
          <strong className="text-white">Tiers and listings.</strong> We place teachers in tiers
          (such as Superhero, Luminary, Local Hero and Ascended Master) based on reach and
          recognition, at our editorial discretion. Listing is currently free. If we introduce
          paid listings or features, they will come with their own terms, and nothing will be
          charged without your clear agreement.
        </p>
        <p>
          <strong className="text-white">Booking a practitioner.</strong> Any arrangement you make
          with a practitioner — a session, course, retreat or purchase — is between you and them.
          We don&apos;t check qualifications, insurance or the quality of their services, and we
          aren&apos;t a party to that arrangement. Please use your own judgement.
        </p>
      </Section>

      <Section title="6. Editorial independence">
        <p>
          What Spiritpedia features, and how it is ordered, is an editorial decision. Affiliate
          commissions never decide what we feature or how we rank it — a book earns its place the
          same way whether it has a link or not.
        </p>
        <p>
          A teacher&apos;s tier reflects our view of their reach and recognition; it is never for
          sale. If we ever introduce paid listings or features, payment will never decide what we
          feature or how we rank it either, and anything paid for will be clearly labelled.
        </p>
      </Section>

      <Section title="7. Reviews and what you post">
        <p>
          You keep ownership of what you post — reviews, profile text, images. By posting it, you
          give us a free, worldwide licence to display, store and share it on Spiritpedia and in
          our own promotion of Spiritpedia, for as long as it is on Spiritpedia.
        </p>
        <p>
          Reviews are checked before they appear. We may decline, edit for length or remove any
          review or practitioner content that breaks these terms. Please don&apos;t post anything
          that:
        </p>
        <List>
          <li>is untrue, misleading or makes health claims (for example, that a practice cures an illness)</li>
          <li>is hateful, harassing, threatening or sexually explicit</li>
          <li>includes someone else&apos;s personal information, or content you don&apos;t have the right to share</li>
          <li>is advertising or spam</li>
        </List>
      </Section>

      <Section title="8. Other people’s content and links">
        <p>
          Videos are embedded from YouTube and remain the property of their creators. Books,
          courses and other offerings link to the sites that sell or host them. We choose what we
          feature carefully, but we don&apos;t control other sites and aren&apos;t responsible for
          their content, products or practices.
        </p>
      </Section>

      <Section title="9. Affiliate links">
        <p>
          Some links, such as &ldquo;Buy on Amazon&rdquo;, earn us a small commission at no extra
          cost to you. See our <A href="/affiliate-disclosure">Affiliate Disclosure</A>.
        </p>
      </Section>

      <Section title="10. Our content">
        <p>
          Spiritpedia&apos;s design, curation, descriptions, emotional search and the Spiritpedia
          name and star logo belong to us. You&apos;re welcome to share links and short quotes.
          Please don&apos;t copy Spiritpedia at scale, scrape it, or reuse our content
          commercially without asking.
        </p>
      </Section>

      <Section title="11. Using Spiritpedia fairly">
        <p>
          Don&apos;t try to break, overload or gain unauthorised access to Spiritpedia or its
          systems; don&apos;t impersonate anyone; and don&apos;t use Spiritpedia for anything
          unlawful.
        </p>
      </Section>

      <Section title="12. Availability and changes">
        <p>
          We work to keep Spiritpedia running smoothly, but we can&apos;t promise it will always be
          available or error-free. We may change, add or remove features and content at any time.
        </p>
      </Section>

      <Section title="13. Our responsibility to you">
        <p>
          Nothing in these terms limits our liability for death or personal injury caused by our
          negligence, for fraud, or for anything else that can&apos;t be limited by law. Nor does
          anything here affect your legal rights as a consumer.
        </p>
        <p>
          Otherwise, Spiritpedia is provided free and &ldquo;as is&rdquo;. We aren&apos;t
          responsible for decisions you make based on content on Spiritpedia, for services
          provided by practitioners, or for losses we couldn&apos;t reasonably have foreseen. Our
          total liability to you for anything else arising from your use of Spiritpedia is limited
          to £100.
        </p>
      </Section>

      <Section title="14. Closing your account">
        <p>
          You can stop using Spiritpedia at any time. To delete your account and its data, email{' '}
          <Mail />.
        </p>
      </Section>

      <Section title="15. Changes to these terms">
        <p>
          We may update these terms as Spiritpedia grows. We&apos;ll change the date at the top,
          and if a change is significant we&apos;ll let account holders know by email.
        </p>
      </Section>

      <Section title="16. Law">
        <p>
          These terms are governed by the law of England and Wales. If you live elsewhere in the UK
          or in the EU, you keep the protections of your local consumer law and can bring a claim
          in your local courts.
        </p>
      </Section>

      <Section title="17. Contact">
        <p>
          Questions about these terms: <Mail />. How we handle your data is explained in our{' '}
          <A href="/privacy">Privacy Policy</A>.
        </p>
      </Section>
    </LegalPage>
  );
}
