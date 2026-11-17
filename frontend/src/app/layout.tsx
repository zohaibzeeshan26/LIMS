import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';
import { QueryProvider } from '@/providers/QueryProvider';
import { AuthProvider } from '@/context/AuthContext';
import { AppShell } from '@/components/layout/AppShell';

const inter = Inter({ subsets: ['latin'], variable: '--font-sans' });

export const metadata: Metadata = {
  title: 'City Pharma LIMS — Laboratory Information Management System',
  description:
    'cGMP and 21 CFR Part 11 compliant Laboratory Information Management System for pharmaceutical manufacturing and quality control.',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={inter.variable} suppressHydrationWarning>
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: `
              try {
                var p = window.location.pathname;
                var t = localStorage.getItem('cp_lims_token') || sessionStorage.getItem('cp_lims_token');
                if (!t && p !== '/login') {
                  window.location.replace('/login');
                }
              } catch(e) {}
            `,
          }}
        />
      </head>
      <body className="font-sans antialiased bg-slate-50 text-slate-900 min-h-screen selection:bg-primary-500 selection:text-white" suppressHydrationWarning>
        <QueryProvider>
          <AuthProvider>
            <AppShell>{children}</AppShell>
          </AuthProvider>
        </QueryProvider>
      </body>
    </html>
  );
}
