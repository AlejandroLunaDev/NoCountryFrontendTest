import { Metadata } from 'next';
import { RegisterForm } from '@/features/auth/components/register-form';

export const metadata: Metadata = {
  title: 'Registro | No Country',
  description:
    'Registra una nueva cuenta en la plataforma para acceder a las simulaciones laborales.'
};

export default function RegisterPage() {
  return (
    <div className='flex min-h-screen flex-col items-center justify-center bg-background p-4'>
      <div className='w-full max-w-md space-y-6'>
        <div className='flex flex-col space-y-2 text-center'>
          <h1 className='text-2xl font-bold tracking-tight'>
            Crear nueva cuenta
          </h1>
          <p className='text-sm text-muted-foreground'>
            Regístrate para comenzar a utilizar la plataforma
          </p>
        </div>
        <RegisterForm />
      </div>
    </div>
  );
}
