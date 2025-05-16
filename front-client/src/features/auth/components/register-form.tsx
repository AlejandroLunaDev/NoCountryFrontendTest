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
const registerSchema = z
  .object({
    email: z.string().email({ message: 'Ingresa un email válido' }),
    password: z
      .string()
      .min(6, { message: 'La contraseña debe tener al menos 6 caracteres' }),
    confirmPassword: z.string()
  })
  .refine(data => data.password === data.confirmPassword, {
    message: 'Las contraseñas no coinciden',
    path: ['confirmPassword']
  });

type RegisterFormValues = z.infer<typeof registerSchema>;

export function RegisterForm() {
  const [isLoading, setIsLoading] = useState(false);
  const { signUp } = useAuth();
  const router = useRouter();

  const form = useForm<RegisterFormValues>({
    resolver: zodResolver(registerSchema),
    defaultValues: {
      email: '',
      password: '',
      confirmPassword: ''
    }
  });

  async function onSubmit(values: RegisterFormValues) {
    try {
      setIsLoading(true);
      const { error } = await signUp(values.email, values.password);

      if (error) {
        toast.error('Error al registrarse', {
          description: error.message || 'Ocurrió un error al crear tu cuenta'
        });
        return;
      }

      toast.success('Registro exitoso', {
        description: 'Revisa tu correo electrónico para confirmar tu cuenta'
      });
      router.push('/login');
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
        <CardTitle>Crear cuenta</CardTitle>
        <CardDescription>
          Registra tus datos para crear una nueva cuenta
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
            <FormField
              control={form.control}
              name='confirmPassword'
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Confirmar contraseña</FormLabel>
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
              {isLoading ? 'Registrando...' : 'Registrarse'}
            </Button>
          </form>
        </Form>
      </CardContent>
      <CardFooter className='flex flex-col space-y-2'>
        <div className='text-sm text-center'>
          ¿Ya tienes una cuenta?{' '}
          <Button
            variant='link'
            className='p-0'
            onClick={() => router.push('/login')}
          >
            Inicia sesión
          </Button>
        </div>
      </CardFooter>
    </Card>
  );
}
