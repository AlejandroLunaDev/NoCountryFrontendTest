'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { toast } from 'sonner';
import Link from 'next/link';
import { Mail, Lock, LogIn, Eye, EyeOff, Github } from 'lucide-react';
import { motion } from 'framer-motion';

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
import { Checkbox } from '@/components/ui/checkbox';
import { useLoginMutation } from '../hooks/use-auth-query';

// Define el esquema de validación con zod
const loginSchema = z.object({
  email: z.string().email({ message: 'Ingresa un email válido' }),
  password: z
    .string()
    .min(6, { message: 'La contraseña debe tener al menos 6 caracteres' }),
  rememberMe: z.boolean().optional()
});

type LoginFormValues = z.infer<typeof loginSchema>;

export function LoginForm() {
  const [showPassword, setShowPassword] = useState(false);
  const router = useRouter();

  const loginMutation = useLoginMutation();
  const isLoading = loginMutation.isPending;

  const form = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      email: '',
      password: '',
      rememberMe: false
    }
  });

  async function onSubmit(values: LoginFormValues) {
    try {
      const { error } = await loginMutation.mutateAsync({
        email: values.email,
        password: values.password
      });

      if (error) {
        toast.error('Error al iniciar sesión', {
          description:
            error.message || 'Verifica tus credenciales e intenta nuevamente'
        });
        return;
      }

      toast.success('Inicio de sesión exitoso');
      router.push('/dashboard');
    } catch {
      toast.error('Error inesperado', {
        description: 'Ocurrió un error al procesar tu solicitud'
      });
    }
  }

  const handleSocialLogin = (provider: string) => {
    toast.info(`Iniciando sesión con ${provider}`, {
      description: 'Esta funcionalidad será implementada próximamente'
    });
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
    >
      <Card className='w-full max-w-[450px] bg-gradient-to-b from-[#121222]/90 to-[#0a0a1a]/90 backdrop-blur-xl border border-zinc-800/50 rounded-2xl shadow-lg overflow-hidden'>
        <div className='p-8'>
          <div className='mb-6 text-center'>
            <h2 className='text-2xl font-bold text-white mb-1'>Bienvenido</h2>
            <p className='text-zinc-400 text-sm'>
              Inicia sesión para continuar
            </p>
          </div>

          <Form {...form}>
            <form
              onSubmit={form.handleSubmit(onSubmit)}
              className='space-y-5 text-white p-4'
            >
              <FormField
                control={form.control}
                name='email'
                render={({ field }) => (
                  <FormItem className='space-y-1.5'>
                    <FormLabel className='text-zinc-200 font-medium mb-1'>
                      Email
                    </FormLabel>
                    <FormControl>
                      <div className='relative flex items-center group'>
                        <div className='absolute left-3.5 text-indigo-300 group-focus-within:text-indigo-400 transition-colors'>
                          <Mail className='h-[18px] w-[18px]' />
                        </div>
                        <Input
                          placeholder='tu@email.com'
                          {...field}
                          disabled={isLoading}
                          className='pl-11 h-12 bg-[#1e1e32] border-[#2a2a45] text-white placeholder:text-zinc-500 rounded-xl focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-400 transition-all'
                        />
                      </div>
                    </FormControl>
                    <FormMessage className='text-red-400 text-sm ml-1 font-normal' />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name='password'
                render={({ field }) => (
                  <FormItem className='space-y-1.5'>
                    <div className='flex justify-between items-center mb-1'>
                      <FormLabel className='text-zinc-200 font-medium'>
                        Contraseña
                      </FormLabel>
                      <Button
                        type='button'
                        onClick={() => {}}
                        variant='link'
                        className='p-0 h-auto text-xs text-indigo-300 font-normal hover:text-indigo-200'
                      >
                        ¿Olvidaste tu contraseña?
                      </Button>
                    </div>
                    <FormControl>
                      <div className='relative flex items-center group'>
                        <div className='absolute left-3.5 text-indigo-300 group-focus-within:text-indigo-400 transition-colors'>
                          <Lock className='h-[18px] w-[18px]' />
                        </div>
                        <Input
                          type={showPassword ? 'text' : 'password'}
                          placeholder='Contraseña'
                          {...field}
                          disabled={isLoading}
                          className='pl-11 pr-11 h-12 bg-[#1e1e32] border-[#2a2a45] text-white placeholder:text-zinc-500 rounded-xl focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-400 transition-all'
                        />
                        <div
                          className='absolute right-3.5 cursor-pointer text-zinc-400 hover:text-zinc-300 transition-colors'
                          onClick={() => setShowPassword(!showPassword)}
                        >
                          {showPassword ? (
                            <EyeOff className='h-[18px] w-[18px]' />
                          ) : (
                            <Eye className='h-[18px] w-[18px]' />
                          )}
                        </div>
                      </div>
                    </FormControl>
                    <FormMessage className='text-red-400 text-sm ml-1 font-normal' />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name='rememberMe'
                render={({ field }) => (
                  <FormItem className='flex items-center space-x-2 space-y-0 mt-2'>
                    <FormControl>
                      <Checkbox
                        checked={field.value}
                        onCheckedChange={field.onChange}
                        className='data-[state=checked]:bg-indigo-600 data-[state=checked]:border-indigo-600'
                      />
                    </FormControl>
                    <FormLabel className='text-zinc-400 text-sm font-normal cursor-pointer'>
                      Recordar mi sesión
                    </FormLabel>
                  </FormItem>
                )}
              />

              <div className='!mt-7'>
                <Button
                  type='submit'
                  disabled={isLoading}
                  className='w-full h-12 bg-gradient-to-r from-indigo-600 to-indigo-700 hover:from-indigo-700 hover:to-indigo-800 text-white rounded-xl shadow-md hover:shadow-indigo-500/20 transition-all flex items-center justify-center gap-2'
                >
                  {isLoading ? (
                    <div className='flex items-center gap-2'>
                      <div className='animate-spin h-4 w-4 border-2 border-white/30 border-t-white rounded-full'></div>
                      <span>Iniciando sesión...</span>
                    </div>
                  ) : (
                    <div className='flex items-center gap-2'>
                      <LogIn className='h-4 w-4' />
                      <span>Iniciar sesión</span>
                    </div>
                  )}
                </Button>
              </div>

              <div className='pt-1'>
                <div className='flex items-center justify-center my-5'>
                  <div className='flex-grow border-t border-zinc-800'></div>
                  <span className='mx-4 text-sm text-zinc-500'>
                    o continúa con
                  </span>
                  <div className='flex-grow border-t border-zinc-800'></div>
                </div>

                <div className='flex gap-3 mb-6'>
                  <Button
                    type='button'
                    onClick={() => handleSocialLogin('GitHub')}
                    variant='outline'
                    className='flex-1 bg-[#1e1e32] hover:bg-[#282842] border-[#2a2a45] text-white h-11 rounded-xl'
                  >
                    <Github className='h-5 w-5 mr-2' />
                    <span>GitHub</span>
                  </Button>
                  <Button
                    type='button'
                    onClick={() => handleSocialLogin('LinkedIn')}
                    variant='outline'
                    className='flex-1 bg-[#1e1e32] hover:bg-[#282842] border-[#2a2a45] text-white h-11 rounded-xl'
                  >
                    <svg
                      xmlns='http://www.w3.org/2000/svg'
                      width='20'
                      height='20'
                      viewBox='0 0 24 24'
                      fill='none'
                      stroke='currentColor'
                      strokeWidth='2'
                      strokeLinecap='round'
                      strokeLinejoin='round'
                      className='h-5 w-5 mr-2'
                    >
                      <path d='M16 8a6 6 0 0 1 6 6v7h-4v-7a2 2 0 0 0-2-2 2 2 0 0 0-2 2v7h-4v-7a6 6 0 0 1 6-6z'></path>
                      <rect x='2' y='9' width='4' height='12'></rect>
                      <circle cx='4' cy='4' r='2'></circle>
                    </svg>
                    <span>LinkedIn</span>
                  </Button>
                </div>

                <p className='text-center text-zinc-400 text-sm'>
                  ¿No tienes una cuenta?{' '}
                  <Link
                    href='/register'
                    className='text-indigo-400 font-medium hover:text-indigo-300 hover:underline transition-colors'
                  >
                    Regístrate
                  </Link>
                </p>
              </div>
            </form>
          </Form>
        </div>
      </Card>
    </motion.div>
  );
}
