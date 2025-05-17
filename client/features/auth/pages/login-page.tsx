import { LoginForm } from '@/features/auth/components/login-form';
import { AuthLayout } from '@/features/auth/components/auth-layout';

export function LoginPage() {
  return (
    <AuthLayout
      title='Iniciar sesión'
      subtitle='Ingresa tus credenciales para acceder a la plataforma'
    >
      <LoginForm />
    </AuthLayout>
  );
}
