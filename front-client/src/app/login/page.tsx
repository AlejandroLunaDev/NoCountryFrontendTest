import { Metadata } from 'next';
import { LoginForm } from '@/features/auth/components/login-form';

export const metadata: Metadata = {
  title: 'Iniciar sesión | No Country',
  description:
    'Inicia sesión en la plataforma para acceder a las simulaciones laborales.'
};

export default function LoginPage() {
  return (
    <div className='flex min-h-screen flex-col items-center justify-center bg-background p-4'>
      <div className='w-full max-w-md space-y-6'>
        <div className='flex flex-col space-y-2 text-center'>
          <h1 className='text-2xl font-bold tracking-tight'>
            Bienvenido a No Country
          </h1>
          <p className='text-sm text-muted-foreground'>
            Inicia sesión para acceder a la plataforma
          </p>
        </div>
        <LoginForm />
      </div>
    </div>
  );
}
