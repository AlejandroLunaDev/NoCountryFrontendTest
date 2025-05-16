import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';
import { Toaster } from 'sonner';
import { AuthProvider } from '@/features/auth/providers/auth-provider';
import { ThemeProvider } from '@/features/layout/providers/theme-provider';

const inter = Inter({ subsets: ['latin'] });

export const metadata: Metadata = {
  title: 'No Country - Simulaciones laborales',
  description: 'Plataforma de simulaciones laborales No Country'
};

export default function RootLayout({
  children
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang='es' suppressHydrationWarning>
      <body className={inter.className}>
        <ThemeProvider defaultTheme='system' storageKey='no-country-theme'>
          <AuthProvider>
            {children}
            <Toaster richColors position='top-right' />
          </AuthProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
