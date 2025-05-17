'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { useAuth } from '../providers/auth-provider';

// Hook para iniciar sesión
export function useLoginMutation() {
  const queryClient = useQueryClient();
  const { signIn } = useAuth();

  return useMutation({
    mutationFn: async ({
      email,
      password
    }: {
      email: string;
      password: string;
    }) => {
      return signIn(email, password);
    },
    onSuccess: () => {
      // Invalidar consultas relacionadas con la sesión y usuario
      queryClient.invalidateQueries({ queryKey: ['auth', 'session'] });
    }
  });
}

// Hook para crear una cuenta
export function useSignUpMutation() {
  const queryClient = useQueryClient();
  const { signUp } = useAuth();

  return useMutation({
    mutationFn: async ({
      email,
      password,
      data
    }: {
      email: string;
      password: string;
      data?: { [key: string]: any };
    }) => {
      return signUp(email, password, { data });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['auth', 'session'] });
    }
  });
}

// Hook para cerrar sesión
export function useLogoutMutation() {
  const queryClient = useQueryClient();
  const { signOut } = useAuth();

  return useMutation({
    mutationFn: async () => {
      return signOut();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['auth', 'session'] });

      // Limpia todas las consultas en caché
      queryClient.clear();
    }
  });
}

// Hook para obtener el usuario actual
export function useCurrentUser() {
  const { user, isLoading } = useAuth();

  return useQuery({
    queryKey: ['auth', 'user'],
    queryFn: () => user,
    // Los datos ya están disponibles desde el contexto
    enabled: !isLoading,
    initialData: user
  });
}

// Hook para verificar si el usuario está autenticado
export function useIsAuthenticated() {
  const { user, isLoading } = useAuth();

  return useQuery({
    queryKey: ['auth', 'authenticated'],
    queryFn: () => !!user,
    enabled: !isLoading,
    initialData: !!user
  });
}
