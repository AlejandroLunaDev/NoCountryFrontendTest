import { Metadata } from 'next';
import { RegisterForm } from '@/features/auth/components/register-form';
import Image from 'next/image';

export const metadata: Metadata = {
  title: 'Registro | No Country',
  description:
    'Registra una nueva cuenta en la plataforma para acceder a las simulaciones laborales.'
};

export default function RegisterPage() {
  return (
    <div className='flex min-h-screen bg-[#0d0d16] dark:bg-[#0d0d16] relative overflow-hidden'>
      {/* Efectos de fondo */}
      <div className='absolute w-full h-full'>
        <div className='absolute top-10 right-1/4 w-96 h-96 bg-purple-500/20 rounded-full blur-3xl opacity-50'></div>
        <div className='absolute top-1/3 left-1/4 w-80 h-80 bg-blue-500/20 rounded-full blur-3xl opacity-40'></div>
        <div className='absolute bottom-20 right-1/3 w-64 h-64 bg-indigo-500/20 rounded-full blur-3xl opacity-50'></div>

        {/* Grid pattern */}
        <div className="absolute inset-0 bg-[url('/grid-pattern.svg')] opacity-20"></div>
      </div>

      {/* Contenido izquierdo - Imagen/Logo */}
      <div className='hidden md:flex w-1/2 flex-col justify-center items-center p-8 relative z-10'>
        <div className='w-full max-w-md'>
          <div className='flex flex-col items-center space-y-8'>
            <Image
              src='/no-country-logo.svg'
              alt='No Country Logo'
              width={240}
              height={60}
              className='mb-6'
              priority
            />
            <h2 className='text-3xl md:text-4xl font-bold text-white text-center leading-tight'>
              Validamos soft skills para reducir la tasa de rotación
            </h2>
            <p className='text-zinc-400 text-center text-lg'>
              Plataforma de simulaciones laborales para conectar talento IT con
              empresas.
            </p>
          </div>
        </div>
      </div>

      {/* Contenido derecho - Formulario */}
      <div className='w-full md:w-1/2 flex flex-col justify-center items-center p-8 relative z-10'>
        <div className='w-full max-w-md space-y-8'>
          <div className='md:hidden flex justify-center mb-8'>
            <Image
              src='/no-country-logo.svg'
              alt='No Country Logo'
              width={180}
              height={45}
              priority
            />
          </div>
          <div className='flex flex-col space-y-3'>
            <h1 className='text-2xl md:text-3xl font-bold text-white'>
              Crear nueva cuenta
            </h1>
            <p className='text-zinc-400'>
              Regístrate para comenzar a utilizar la plataforma
            </p>
          </div>
          <RegisterForm />
        </div>
      </div>
    </div>
  );
}
