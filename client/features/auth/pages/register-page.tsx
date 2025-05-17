import { RegisterForm } from '@/features/auth/components/register-form';
import { AuthLayout } from '@/features/auth/components/auth-layout';

export function RegisterPage() {
  return (
    <AuthLayout
      title='Crear nueva cuenta'
      subtitle='Regístrate para comenzar a utilizar la plataforma'
    >
      <RegisterForm />
    </AuthLayout>
  );
}
