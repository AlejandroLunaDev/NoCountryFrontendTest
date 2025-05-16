'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '../providers/auth-provider';

interface ProtectedRouteProps {
  children: React.ReactNode;
}

export function ProtectedRoute({ children }: ProtectedRouteProps) {
  const { user, isLoading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!isLoading && !user) {
      router.replace('/login');
    }
  }, [user, isLoading, router]);

  if (isLoading) {
    return (
      <div className='flex items-center justify-center min-h-screen'>
        <div className='flex flex-col items-center justify-center space-y-4'>
          <div className='w-16 h-16 border-4 border-primary border-t-transparent rounded-full animate-spin'></div>
          <p className='text-muted-foreground'>Cargando...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return null; // No renderizar nada mientras redirige
  }

  return <>{children}</>;
}
