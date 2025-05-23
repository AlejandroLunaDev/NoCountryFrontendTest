'use client';

import { useState, useEffect, useMemo } from 'react';
import { useUsers } from '../hooks/use-chat.ts';
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
import { Plus, Search, User, AlertCircle, Loader2, Check } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { toast } from 'sonner';
import { Avatar } from '@/components/ui/avatar';
import { AvatarFallback } from '@/components/ui/avatar';
import { cn } from '@/lib/utils';

interface UserSelectDialogProps {
  onSelectUser: (userId: string) => void;
  trigger?: React.ReactNode;
  id?: string;
  allowMultiple?: boolean;
  selectedUsers?: string[];
  onCreateChat?: (
    isGroup: boolean,
    userIds: string[],
    groupName: string
  ) => void;
}

export function UserSelectDialog({
  onSelectUser,
  trigger,
  id,
  allowMultiple = true,
  selectedUsers = [],
  onCreateChat
}: UserSelectDialogProps) {
  const { data: users, isLoading, error, refetch } = useUsers();
  const [search, setSearch] = useState('');
  const [open, setOpen] = useState(false);
  const [isRetrying, setIsRetrying] = useState(false);
  const [selectedUserIds, setSelectedUserIds] = useState<string[]>([]);
  const [groupName, setGroupName] = useState('');

  // Reset selections when dialog opens
  useEffect(() => {
    if (open) {
      setSelectedUserIds([]);
      setGroupName('');
    }
  }, [open]);

  // Handle dialog opening
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

  const filteredUsers = useMemo(() => {
    if (!users) return [];
    return users.filter(user => {
      const searchLower = search.toLowerCase();
      return (
        user.name?.toLowerCase().includes(searchLower) ||
        user.email?.toLowerCase().includes(searchLower)
      );
    });
  }, [users, search]);

  const handleSelectUser = (userId: string) => {
    setSelectedUserIds(prev => {
      // Toggle selection: remove if already selected, add if not
      if (prev.includes(userId)) {
        return prev.filter(id => id !== userId);
      } else {
        return [...prev, userId];
      }
    });
  };

  const handleCreateChat = () => {
    if (!onCreateChat || selectedUserIds.length === 0) return;

    const isGroup = selectedUserIds.length > 1;
    onCreateChat(isGroup, selectedUserIds, isGroup ? groupName : '');
    setOpen(false);
  };

  // Get initials from a name or email
  const getInitials = (nameOrEmail: string) => {
    if (!nameOrEmail) return 'U';

    // If it's an email, use the first character before @
    if (nameOrEmail.includes('@')) {
      return nameOrEmail.split('@')[0].charAt(0).toUpperCase();
    }

    // For names, get initials for first and last names
    return nameOrEmail
      .split(' ')
      .map(n => n[0])
      .join('')
      .toUpperCase()
      .substring(0, 2);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild id={id}>
        {trigger || (
          <Button
            size='sm'
            className='rounded-full bg-zinc-700 hover:bg-zinc-600 text-white'
          >
            <Plus className='h-4 w-4 mr-2' />
            Nuevo mensaje
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className='sm:max-w-md bg-zinc-800 border-zinc-700 text-white'>
        <DialogHeader>
          <DialogTitle className='text-xl text-white'>
            {selectedUserIds.length > 1 ? 'Crear grupo' : 'Nuevo mensaje'}
          </DialogTitle>
          <DialogDescription className='text-zinc-400'>
            {selectedUserIds.length > 1
              ? 'Selecciona usuarios para tu grupo'
              : 'Selecciona un usuario para chatear'}
          </DialogDescription>
        </DialogHeader>

        {selectedUserIds.length > 1 && (
          <div className='space-y-2'>
            <label className='text-sm text-zinc-400'>Nombre del grupo</label>
            <Input
              placeholder='Nombre del grupo'
              value={groupName}
              onChange={e => setGroupName(e.target.value)}
              className='bg-zinc-700 border-zinc-600'
            />
          </div>
        )}

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
          {isLoading || isRetrying ? (
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
          ) : !filteredUsers?.length ? (
            <div className='text-center py-6'>
              <Search className='h-10 w-10 text-zinc-500 mb-2 mx-auto' />
              <p className='text-white font-medium'>
                No se encontraron resultados
              </p>
              <p className='text-sm text-zinc-400'>
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
                className={cn(
                  'w-full justify-start p-3 h-auto rounded-md hover:bg-zinc-700 text-zinc-300 hover:text-white',
                  selectedUserIds.includes(user.id) && 'bg-zinc-700 text-white'
                )}
                onClick={() => handleSelectUser(user.id)}
              >
                <Avatar className='h-9 w-9 mr-3'>
                  <AvatarFallback className='bg-zinc-600 text-zinc-200'>
                    {getInitials(user.name || user.email)}
                  </AvatarFallback>
                </Avatar>
                <div className='text-left flex-1'>
                  <p className='font-medium text-white'>
                    {user.name || user.email?.split('@')[0] || 'Usuario'}
                  </p>
                  {user.email && (
                    <p className='text-xs text-zinc-400'>{user.email}</p>
                  )}
                </div>
                {selectedUserIds.includes(user.id) && (
                  <Check className='h-5 w-5 text-green-500' />
                )}
              </Button>
            ))
          )}
        </div>

        <DialogFooter className='mt-4'>
          <div className='flex justify-between items-center w-full'>
            <div className='text-sm text-zinc-400'>
              {selectedUserIds.length} usuario
              {selectedUserIds.length !== 1 && 's'} seleccionado
              {selectedUserIds.length !== 1 && 's'}
            </div>
            <Button
              onClick={handleCreateChat}
              disabled={
                selectedUserIds.length === 0 ||
                (selectedUserIds.length > 1 && !groupName.trim())
              }
              className='bg-primary'
            >
              {selectedUserIds.length > 1 ? 'Crear grupo' : 'Iniciar chat'}
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
