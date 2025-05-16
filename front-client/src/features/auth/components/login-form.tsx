'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { toast } from 'sonner';

import { Button } from '@/components/ui/button';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle
} from '@/components/ui/card';
import { useAuth } from '../providers/auth-provider';

// Define el esquema de validación con zod
const loginSchema = z.object({
  email: z.string().email({ message: 'Ingresa un email válido' }),
  password: z
    .string()
    .min(6, { message: 'La contraseña debe tener al menos 6 caracteres' })
});

type LoginFormValues = z.infer<typeof loginSchema>;

export function LoginForm() {
  const [isLoading, setIsLoading] = useState(false);
  const { signIn } = useAuth();
  const router = useRouter();

  const form = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      email: '',
      password: ''
    }
  });

  async function onSubmit(values: LoginFormValues) {
    try {
      setIsLoading(true);
      const { error } = await signIn(values.email, values.password);

      if (error) {
        toast.error('Error al iniciar sesión', {
          description:
            error.message || 'Verifica tus credenciales e intenta nuevamente'
        });
        return;
      }

      toast.success('Inicio de sesión exitoso');
      router.push('/dashboard');
    } catch (error) {
      toast.error('Error inesperado', {
        description: 'Ocurrió un error al procesar tu solicitud'
      });
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <Card className='w-full max-w-md'>
      <CardHeader>
        <CardTitle>Iniciar sesión</CardTitle>
        <CardDescription>
          Ingresa tus credenciales para acceder a la plataforma
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className='space-y-4'>
            <FormField
              control={form.control}
              name='email'
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Email</FormLabel>
                  <FormControl>
                    <Input
                      placeholder='tu@email.com'
                      {...field}
                      disabled={isLoading}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name='password'
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Contraseña</FormLabel>
                  <FormControl>
                    <Input
                      type='password'
                      placeholder='******'
                      {...field}
                      disabled={isLoading}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <Button type='submit' className='w-full' disabled={isLoading}>
              {isLoading ? 'Iniciando sesión...' : 'Iniciar sesión'}
            </Button>
          </form>
        </Form>
      </CardContent>
      <CardFooter className='flex flex-col space-y-2'>
        <div className='text-sm text-center'>
          ¿No tienes una cuenta?{' '}
          <Button
            variant='link'
            className='p-0'
            onClick={() => router.push('/register')}
          >
            Regístrate
          </Button>
        </div>
      </CardFooter>
    </Card>
  );
}
