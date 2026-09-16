// The admin pages are client components and cannot export metadata themselves,
// so this layout carries it: the dashboard and its login screen are never
// meant to be indexed or previewed, and they should not inherit the public
// share card.
export const metadata = {
  title: 'Admin',
  robots: { index: false, follow: false, nocache: true },
  openGraph: null,
  twitter: null,
};

export default function AdminLayout({ children }) {
  return children;
}
