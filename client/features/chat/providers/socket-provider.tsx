'use client';

import React, {
  createContext,
  useContext,
  useEffect,
  useState,
  ReactNode
} from 'react';
import { useAuth } from '@/features/auth/providers/auth-provider';
import socket, { connectSocket, disconnectSocket } from '@/lib/socket';
import { toast } from 'sonner';

type SocketStatus = 'disconnected' | 'connecting' | 'connected' | 'error';

interface SocketContextType {
  status: SocketStatus;
  connect: () => void;
  disconnect: () => void;
  socket: typeof socket;
}

const SocketContext = createContext<SocketContextType | undefined>(undefined);

export const SocketProvider = ({ children }: { children: ReactNode }) => {
  const [status, setStatus] = useState<SocketStatus>('disconnected');
  const { session } = useAuth();

  // Función para conectar el socket
  const connect = () => {
    if (status === 'connected') return;

    if (!session?.access_token) {
      toast.error('No se puede conectar al chat', {
        description: 'Necesitas iniciar sesión para usar el chat'
      });
      return;
    }

    try {
      setStatus('connecting');
      console.log('Connecting socket with userId:', session.user.id);
      connectSocket(session.access_token, session.user.id);
    } catch (error) {
      setStatus('error');
      toast.error('Error al conectar al servidor de chat', {
        description: 'Inténtalo nuevamente más tarde'
      });
    }
  };

  // Función para desconectar el socket
  const disconnect = () => {
    if (status !== 'connected') return;

    disconnectSocket();
    setStatus('disconnected');
  };

  // Manejar eventos del socket
  useEffect(() => {
    // Evento de conexión exitosa
    const onConnect = () => {
      setStatus('connected');
      // Comentamos o eliminamos el toast de conexión exitosa
      // toast.success('Conectado al chat', { id: 'socket-connection' });

      // Subscribe to general events when connected
      if (session?.user?.id) {
        console.log('Subscribing to notifications for user:', session.user.id);
        socket.emit('subscribe_user_notifications', session.user.id);
      }
    };

    // Evento de error de conexión
    const onConnectError = (err: Error) => {
      console.error('Error de conexión al socket:', err);
      setStatus('error');
      toast.error('Error de conexión al chat', {
        id: 'socket-error',
        description: 'No se pudo establecer conexión con el servidor'
      });
    };

    // Evento de desconexión
    const onDisconnect = (reason: string) => {
      setStatus('disconnected');

      if (reason !== 'io client disconnect') {
        toast.info('Desconectado del chat', {
          description: 'La conexión se ha perdido'
        });
      }
    };

    // Registrar manejadores de eventos
    socket.on('connect', onConnect);
    socket.on('connect_error', onConnectError);
    socket.on('disconnect', onDisconnect);

    // Limpiar manejadores de eventos al desmontar
    return () => {
      socket.off('connect', onConnect);
      socket.off('connect_error', onConnectError);
      socket.off('disconnect', onDisconnect);

      // Asegurar que el socket se desconecte al desmontar
      if (socket.connected) {
        disconnectSocket();
      }
    };
  }, []);

  // Conectar automáticamente cuando hay una sesión válida
  useEffect(() => {
    if (session?.access_token && status === 'disconnected') {
      connect();
    }

    // Cuando la sesión termina, desconectar
    if (!session?.access_token && status === 'connected') {
      disconnect();
    }
  }, [session, status]);

  return (
    <SocketContext.Provider value={{ status, connect, disconnect, socket }}>
      {children}
    </SocketContext.Provider>
  );
};

export const useSocket = () => {
  const context = useContext(SocketContext);
  if (context === undefined) {
    throw new Error('useSocket debe usarse dentro de un SocketProvider');
  }
  return context;
};
