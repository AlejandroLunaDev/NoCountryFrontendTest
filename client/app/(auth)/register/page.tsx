import { Metadata } from 'next';
import { RegisterPage } from '@/features/auth/pages/register-page';

export const metadata: Metadata = {
  title: 'Registro | No Country',
  description:
    'Registra una nueva cuenta en la plataforma para acceder a las simulaciones laborales.'
};

export default function Page() {
  return <RegisterPage />;
}
