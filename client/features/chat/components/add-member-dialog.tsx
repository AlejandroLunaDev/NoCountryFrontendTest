'use client';

import { useState } from 'react';
import { useUsers } from '../hooks/use-chat.ts';
import { useAddMemberToChat } from '../hooks/use-chat.ts';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogDescription,
  DialogFooter
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Search, UserPlus, AlertCircle, Loader2 } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { Avatar } from '@/components/ui/avatar';
import { AvatarFallback } from '@/components/ui/avatar';
import { toast } from 'sonner';
import { Chat } from '../lib/api';

interface AddMemberDialogProps {
  chatId: string;
  currentMembers: string[];
  trigger?: React.ReactNode;
}

export function AddMemberDialog({
  chatId,
  currentMembers,
  trigger
}: AddMemberDialogProps) {
  const { data: users, isLoading, error, refetch } = useUsers();
  const addMemberMutation = useAddMemberToChat();
  const [search, setSearch] = useState('');
  const [open, setOpen] = useState(false);
  const [isRetrying, setIsRetrying] = useState(false);

  const handleRetry = async () => {
    setIsRetrying(true);
    try {
      await refetch();
    } catch (e) {
      toast.error('Error al recargar usuarios');
    } finally {
      setIsRetrying(false);
    }
  };

  // Filtrar usuarios eliminando los que ya son miembros
  const availableUsers = Array.isArray(users)
    ? users
        .filter(user => !currentMembers.includes(user.id))
        .filter(user => {
          if (!search) return true;
          const searchTerm = search.toLowerCase();
          return (
            (user.name || '').toLowerCase().includes(searchTerm) ||
            (user.email || '').toLowerCase().includes(searchTerm)
          );
        })
    : [];

  const handleAddMember = async (userId: string) => {
    try {
      await addMemberMutation.mutateAsync({ chatId, userId });
      setOpen(false);
    } catch (error) {
      console.error('Error adding member:', error);
    }
  };

  // Obtener iniciales para el avatar
  const getInitials = (nameOrEmail: string) => {
    if (!nameOrEmail) return 'U';

    // Si es email, usar la primera letra antes del @
    if (nameOrEmail.includes('@')) {
      return nameOrEmail.split('@')[0].charAt(0).toUpperCase();
    }

    // Para nombres, obtener iniciales de nombres y apellidos
    return nameOrEmail
      .split(' ')
      .map(n => n[0])
      .join('')
      .toUpperCase()
      .substring(0, 2);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger || (
          <Button
            size='sm'
            variant='ghost'
            className='h-8 w-8 text-zinc-400 hover:text-white hover:bg-zinc-700'
          >
            <UserPlus className='h-4 w-4' />
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className='sm:max-w-md bg-zinc-800 border-zinc-700 text-white'>
        <DialogHeader>
          <DialogTitle className='text-xl text-white'>
            Añadir miembro al grupo
          </DialogTitle>
          <DialogDescription className='text-zinc-400'>
            Busca y selecciona usuarios para añadir al chat grupal
          </DialogDescription>
        </DialogHeader>

        <div className='relative my-4'>
          <Search className='absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-400' />
          <Input
            placeholder='Buscar usuarios...'
            className='pl-10 bg-zinc-700 border-none text-white focus-visible:ring-1 focus-visible:ring-zinc-500'
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>

        <div className='max-h-[300px] overflow-y-auto space-y-1 mt-2 rounded-md'>
          {isLoading || addMemberMutation.isPending || isRetrying ? (
            Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className='flex items-center gap-3 p-3 rounded-md'>
                <Skeleton className='h-9 w-9 rounded-full bg-zinc-700' />
                <div className='space-y-2 flex-1'>
                  <Skeleton className='h-4 w-1/3 bg-zinc-700' />
                  <Skeleton className='h-3 w-1/2 bg-zinc-700' />
                </div>
              </div>
            ))
          ) : error ? (
            <div className='text-center py-6 flex flex-col items-center'>
              <AlertCircle className='h-8 w-8 text-red-400 mb-2' />
              <p className='text-white font-medium'>
                No se pudieron cargar los usuarios
              </p>
              <p className='text-sm text-zinc-400 mb-3'>
                Hubo un problema al conectar con el servidor
              </p>
              <Button
                size='sm'
                onClick={handleRetry}
                variant='outline'
                className='bg-zinc-700 text-white border-zinc-600 hover:bg-zinc-600'
              >
                {isRetrying ? (
                  <>
                    <Loader2 className='h-4 w-4 mr-2 animate-spin' />
                    Cargando...
                  </>
                ) : (
                  'Intentar nuevamente'
                )}
              </Button>
            </div>
          ) : !availableUsers?.length ? (
            <div className='text-center py-6'>
              <Search className='h-10 w-10 text-zinc-500 mb-2 mx-auto' />
              <p className='text-white font-medium'>
                No se encontraron usuarios disponibles
              </p>
              <p className='text-sm text-zinc-400'>
                {search
                  ? 'Intenta con otros términos de búsqueda'
                  : 'Todos los usuarios ya son miembros de este chat'}
              </p>
            </div>
          ) : (
            availableUsers.map(user => (
              <Button
                key={user.id}
                variant='ghost'
                className='w-full justify-start p-3 h-auto rounded-md hover:bg-zinc-700 text-zinc-300 hover:text-white'
                onClick={() => handleAddMember(user.id)}
                disabled={addMemberMutation.isPending}
              >
                <Avatar className='h-9 w-9 mr-3'>
                  <AvatarFallback className='bg-zinc-600 text-zinc-200'>
                    {getInitials(user.name || user.email)}
                  </AvatarFallback>
                </Avatar>
                <div className='text-left'>
                  <p className='font-medium text-white'>
                    {user.name || user.email?.split('@')[0] || 'Usuario'}
                  </p>
                  {user.email && (
                    <p className='text-xs text-zinc-400'>{user.email}</p>
                  )}
                </div>
              </Button>
            ))
          )}
        </div>

        <DialogFooter className='mt-4'>
          <Button
            variant='ghost'
            onClick={() => setOpen(false)}
            className='text-zinc-400 hover:text-white hover:bg-zinc-700'
          >
            Cancelar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
