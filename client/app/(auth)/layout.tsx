'use client';

import { ReactNode } from 'react';
import { useAuth } from '@/features/auth/providers/auth-provider';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';

export default function AuthLayout({ children }: { children: ReactNode }) {
  const { user, isLoading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    // Si el usuario ya está autenticado, redirigir al dashboard
    if (!isLoading && user) {
      router.push('/dashboard');
    }
  }, [user, isLoading, router]);

  // Mostrar spinner de carga mientras verificamos la autenticación
  if (isLoading) {
    return (
      <div className='flex items-center justify-center h-screen bg-zinc-900'>
        <div className='animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full'></div>
      </div>
    );
  }

  // Solo mostrar el contenido si NO hay usuario autenticado
  if (!user || isLoading) {
    return <>{children}</>;
  }

  // Si hay usuario y no estamos cargando, no renderizar (la redirección se maneja en useEffect)
  return null;
}
