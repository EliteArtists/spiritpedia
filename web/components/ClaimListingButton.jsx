import Link from 'next/link';
import { claimPath, showsClaimButton } from '@/utils/listings';

// "Is this you? Claim this listing" (owner, 23 Nov 2026): on every public
// listing page nobody has claimed (utils/listings.js → showsClaimButton).
// It opens the claim flow for this listing (/auth/claim): signed out, it
// goes through sign-up first; an email that doesn't match can still ask.
// `kind` 'publisher' for a publisher's page.
export default function ClaimListingButton({ listing, slug, kind = 'healer', className = '' }) {
  if (!showsClaimButton(listing)) return null;
  return (
    <Link
      href={claimPath({ kind, slug })}
      className={`inline-flex items-center gap-2 rounded-full border border-[#a78bfa]/60 bg-[#7c3aed]/15 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-[#7c3aed]/30 ${className}`}
    >
      <span className="text-gray-300">Is this you?</span>
      <span>Claim this listing &rarr;</span>
    </Link>
  );
}
