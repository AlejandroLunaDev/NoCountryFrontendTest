'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import Link from 'next/link';
import { Mail, Lock, UserPlus, User } from 'lucide-react';

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
import { Card } from '@/components/ui/card';
import { useAuth } from '../providers/auth-provider';
import { showToast } from '@/components/ui/custom-toast';

// Define el esquema de validación con zod
const registerSchema = z
  .object({
    name: z.string().min(2, { message: 'Ingresa un nombre válido' }),
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
      name: '',
      email: '',
      password: '',
      confirmPassword: ''
    }
  });

  async function onSubmit(values: RegisterFormValues) {
    try {
      setIsLoading(true);
      const { error } = await signUp(values.email, values.password, {
        data: { name: values.name }
      });

      if (error) {
        showToast.error(
          'Error al registrarse',
          error.message || 'Ocurrió un error al crear tu cuenta'
        );
        return;
      }

      showToast.success(
        'Registro exitoso',
        'Revisa tu correo electrónico para confirmar tu cuenta'
      );
      router.push('/login');
    } catch (error) {
      showToast.error(
        'Error inesperado',
        'Ocurrió un error al procesar tu solicitud'
      );
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <Card className='w-full bg-black/20 backdrop-blur-lg border-zinc-800 rounded-xl shadow-lg overflow-hidden'>
      <div className='p-6 sm:p-8'>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className='space-y-5'>
            <FormField
              control={form.control}
              name='name'
              render={({ field }) => (
                <FormItem>
                  <FormLabel className='text-zinc-300'>Nombre</FormLabel>
                  <FormControl>
                    <div className='relative'>
                      <User className='absolute left-3 top-1/2 transform -translate-y-1/2 text-zinc-500 h-4 w-4' />
                      <Input
                        placeholder='Tu nombre'
                        {...field}
                        disabled={isLoading}
                        className='pl-10 bg-zinc-800/50 border-zinc-700 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 text-white placeholder:text-zinc-500 transition-all'
                      />
                    </div>
                  </FormControl>
                  <FormMessage className='text-red-400 text-sm' />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name='email'
              render={({ field }) => (
                <FormItem>
                  <FormLabel className='text-zinc-300'>Email</FormLabel>
                  <FormControl>
                    <div className='relative'>
                      <Mail className='absolute left-3 top-1/2 transform -translate-y-1/2 text-zinc-500 h-4 w-4' />
                      <Input
                        placeholder='tu@email.com'
                        {...field}
                        disabled={isLoading}
                        className='pl-10 bg-zinc-800/50 border-zinc-700 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 text-white placeholder:text-zinc-500 transition-all'
                      />
                    </div>
                  </FormControl>
                  <FormMessage className='text-red-400 text-sm' />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name='password'
              render={({ field }) => (
                <FormItem>
                  <FormLabel className='text-zinc-300'>Contraseña</FormLabel>
                  <FormControl>
                    <div className='relative'>
                      <Lock className='absolute left-3 top-1/2 transform -translate-y-1/2 text-zinc-500 h-4 w-4' />
                      <Input
                        type='password'
                        placeholder='••••••'
                        {...field}
                        disabled={isLoading}
                        className='pl-10 bg-zinc-800/50 border-zinc-700 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 text-white placeholder:text-zinc-500 transition-all'
                      />
                    </div>
                  </FormControl>
                  <FormMessage className='text-red-400 text-sm' />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name='confirmPassword'
              render={({ field }) => (
                <FormItem>
                  <FormLabel className='text-zinc-300'>
                    Confirmar contraseña
                  </FormLabel>
                  <FormControl>
                    <div className='relative'>
                      <Lock className='absolute left-3 top-1/2 transform -translate-y-1/2 text-zinc-500 h-4 w-4' />
                      <Input
                        type='password'
                        placeholder='••••••'
                        {...field}
                        disabled={isLoading}
                        className='pl-10 bg-zinc-800/50 border-zinc-700 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 text-white placeholder:text-zinc-500 transition-all'
                      />
                    </div>
                  </FormControl>
                  <FormMessage className='text-red-400 text-sm' />
                </FormItem>
              )}
            />

            <Button
              type='submit'
              disabled={isLoading}
              className='w-full py-6 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white font-medium rounded-lg shadow-lg hover:shadow-indigo-500/20 transition-all duration-200 flex items-center justify-center gap-2'
            >
              {isLoading ? (
                <>
                  <div className='animate-spin h-5 w-5 border-2 border-white/30 border-t-white rounded-full'></div>
                  <span>Registrando...</span>
                </>
              ) : (
                <>
                  <UserPlus className='h-5 w-5' />
                  <span>Registrarse</span>
                </>
              )}
            </Button>

            <div className='pt-2'>
              <div className='flex items-center justify-center my-4'>
                <div className='flex-grow border-t border-zinc-700'></div>
                <span className='mx-4 text-sm text-zinc-500'>o</span>
                <div className='flex-grow border-t border-zinc-700'></div>
              </div>

              <p className='text-sm text-center text-zinc-400'>
                ¿Ya tienes una cuenta?{' '}
                <Link
                  href='/login'
                  className='text-indigo-400 hover:text-indigo-300 hover:underline transition-colors'
                >
                  Inicia sesión
                </Link>
              </p>
            </div>
          </form>
        </Form>
      </div>
    </Card>
  );
}
