'use client';

import { useState, useEffect } from 'react';
import { useUsers } from '../hooks/use-chat';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogDescription
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Plus, Search, User, AlertCircle, Loader2 } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { toast } from 'sonner';

interface UserSelectDialogProps {
  onSelectUser: (userId: string, userName: string) => void;
  trigger?: React.ReactNode;
}

export function UserSelectDialog({
  onSelectUser,
  trigger
}: UserSelectDialogProps) {
  const { data: users, isLoading, error, refetch } = useUsers();
  const [search, setSearch] = useState('');
  const [open, setOpen] = useState(false);
  const [isRetrying, setIsRetrying] = useState(false);

  // Manejar apertura del diálogo
  useEffect(() => {
    if (open && error) {
      toast.error('Error al cargar usuarios', {
        description: 'Verifica tu conexión e intenta nuevamente'
      });
    }
  }, [open, error]);

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

  // Aseguramos que users sea un array antes de filtrar
  const filteredUsers = Array.isArray(users)
    ? users.filter(user => {
        if (!search) return true;
        const searchTerm = search.toLowerCase();
        return (
          (user.name || '').toLowerCase().includes(searchTerm) ||
          (user.email || '').toLowerCase().includes(searchTerm)
        );
      })
    : [];

  const handleSelectUser = (userId: string, userName: string) => {
    onSelectUser(userId, userName);
    setOpen(false);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger || (
          <Button
            size='sm'
            className='rounded-full shadow-sm bg-primary hover:bg-primary/90'
          >
            <Plus className='h-5 w-5 mr-2' />
            Nuevo chat
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className='sm:max-w-md'>
        <DialogHeader>
          <DialogTitle className='text-xl text-gray-900 dark:text-white'>
            Seleccionar usuario
          </DialogTitle>
          <DialogDescription className='text-gray-600 dark:text-gray-400'>
            Busca y selecciona un usuario para iniciar una conversación
          </DialogDescription>
        </DialogHeader>

        <div className='relative my-4'>
          <Search className='absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-500' />
          <Input
            placeholder='Buscar usuarios...'
            className='pl-10'
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>

        <div className='max-h-[300px] overflow-y-auto space-y-2 mt-4 rounded-md bg-gray-50 dark:bg-gray-900 p-1'>
          {isLoading || isRetrying ? (
            Array.from({ length: 5 }).map((_, i) => (
              <div
                key={i}
                className='flex items-center gap-3 p-3 rounded-lg bg-card dark:bg-gray-800'
              >
                <Skeleton className='h-10 w-10 rounded-full' />
                <div className='space-y-2 flex-1'>
                  <Skeleton className='h-4 w-1/3' />
                  <Skeleton className='h-3 w-1/2' />
                </div>
              </div>
            ))
          ) : error ? (
            <div className='text-center py-6 flex flex-col items-center'>
              <AlertCircle className='h-8 w-8 text-destructive mb-2' />
              <p className='text-gray-700 dark:text-gray-300 font-medium'>
                No se pudieron cargar los usuarios
              </p>
              <p className='text-sm text-gray-500 dark:text-gray-400 mb-3'>
                Hubo un problema al conectar con el servidor
              </p>
              <Button size='sm' onClick={handleRetry} variant='outline'>
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
          ) : !filteredUsers?.length ? (
            <div className='text-center py-6'>
              <Search className='h-10 w-10 text-gray-400 mb-2 mx-auto' />
              <p className='text-gray-700 dark:text-gray-300 font-medium'>
                No se encontraron resultados
              </p>
              <p className='text-sm text-gray-500 dark:text-gray-400'>
                {search
                  ? 'Intenta con otros términos de búsqueda'
                  : 'No hay usuarios disponibles'}
              </p>
            </div>
          ) : (
            filteredUsers.map(user => (
              <Button
                key={user.id}
                variant='ghost'
                className='w-full justify-start p-3 h-auto rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800'
                onClick={() =>
                  handleSelectUser(user.id, user.name || user.email)
                }
              >
                <div className='h-10 w-10 rounded-full bg-primary text-white flex items-center justify-center mr-3 flex-shrink-0'>
                  {(user.name || user.email || 'U').charAt(0).toUpperCase()}
                </div>
                <div className='text-left'>
                  <p className='font-medium text-gray-900 dark:text-white'>
                    {user.name || 'Usuario'}
                  </p>
                  <p className='text-xs text-gray-500 dark:text-gray-400'>
                    {user.email}
                  </p>
                </div>
              </Button>
            ))
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
