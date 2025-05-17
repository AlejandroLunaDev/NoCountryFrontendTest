import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';
import { Toaster } from 'sonner';
import { AuthProvider } from '@/features/auth/providers/auth-provider';
import { ThemeProvider } from '@/features/layout/providers/theme-provider';
import { ThemeToggle } from '@/features/layout/components/theme-toggle';
import { QueryProvider } from '@/lib/providers/query-provider';
import { SocketProvider } from '@/features/chat/providers/socket-provider';

const inter = Inter({ subsets: ['latin'] });

export const metadata: Metadata = {
  title: 'No Country - Chat',
  description: 'Plataforma de chat para simulaciones laborales No Country'
};

export default function RootLayout({
  children
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang='es' suppressHydrationWarning className='dark'>
      <body className={`${inter.className} antialiased`}>
        <ThemeProvider defaultTheme='dark' storageKey='no-country-theme'>
          <QueryProvider>
            <AuthProvider>
              <SocketProvider>
                <div className='relative flex min-h-screen flex-col'>
                  <div className='fixed bottom-4 right-4 z-50'>
                    <ThemeToggle />
                  </div>
                  <Toaster richColors position='top-right' />
                  {children}
                </div>
              </SocketProvider>
            </AuthProvider>
          </QueryProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
