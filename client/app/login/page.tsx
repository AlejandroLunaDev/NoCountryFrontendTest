import { Metadata } from 'next';
import { LoginPage } from '@/features/auth/pages/login-page';

export const metadata: Metadata = {
  title: 'Iniciar sesión | No Country',
  description:
    'Inicia sesión en la plataforma para acceder a las simulaciones laborales.'
};

export default function Page() {
  return <LoginPage />;
}
