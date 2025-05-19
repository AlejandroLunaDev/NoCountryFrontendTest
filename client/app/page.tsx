'use client';

import { useAuth } from '@/features/auth/providers/auth-provider';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';

export default function HomePage() {
  const { user, isLoading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!isLoading) {
      if (user) {
        router.push('/dashboard');
      } else {
        router.push('/login');
      }
    }
  }, [user, isLoading, router]);

  // Mostrar un loader mientras se verifica la autenticación
  return (
    <div className='flex items-center justify-center h-screen bg-zinc-900'>
      <div className='animate-spin h-10 w-10 border-4 border-primary border-t-transparent rounded-full'></div>
    </div>
  );
}
