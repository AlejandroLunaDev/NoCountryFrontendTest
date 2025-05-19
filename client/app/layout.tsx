import './globals.css';
import { Metadata } from 'next';
import { Inter } from 'next/font/google';
import type { Viewport } from 'next';
import { AuthProvider } from '@/features/auth/providers/auth-provider';
import { CustomToaster } from '@/components/ui/custom-toast';
import { Toaster } from '@/components/ui/sonner';
import { QueryProvider } from '@/lib/providers/query-provider';
import { ModalProvider } from '@/components/modal-provider';
import { Suspense } from 'react';

const inter = Inter({ subsets: ['latin'] });

export const metadata: Metadata = {
  title: 'No Country Chat',
  description: 'Una aplicación de chat para No Country'
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1
};

export default function RootLayout({
  children
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang='es' suppressHydrationWarning className='dark'>
      <body className={inter.className}>
        <div suppressHydrationWarning className='bg-zinc-950 text-zinc-50'>
          <div>
            <div className='min-h-screen'>
              <AuthProvider>
                <QueryProvider>
                  <Suspense>
                    <Toaster position='top-center' />
                    <div className='relative flex min-h-screen flex-col'>
                      <div className='fixed bottom-4 right-4 z-50'>
                        <CustomToaster />
                      </div>
                      {children}
                    </div>
                  </Suspense>
                </QueryProvider>
              </AuthProvider>
            </div>
          </div>
        </div>
      </body>
    </html>
  );
}
