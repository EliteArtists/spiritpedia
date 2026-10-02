import AdminShell from '@/components/admin/AdminShell';

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

// ADMIN_NAME is read here, in a server component, and handed down as a prop.
// It has no NEXT_PUBLIC_ prefix and must not get one — the shell is a client
// component and could not read process.env itself.
export default function AdminLayout({ children }) {
  return <AdminShell adminName={process.env.ADMIN_NAME || ''}>{children}</AdminShell>;
}
