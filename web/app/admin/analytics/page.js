import { redirect } from 'next/navigation';

// "Analytics" became Admin → Activity (migration 0021), which keeps the
// database totals at its foot. Old bookmarks land there.
export default function AdminAnalyticsPage() {
  redirect('/admin/activity');
}
