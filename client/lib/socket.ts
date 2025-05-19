import { io } from 'socket.io-client';

// URL del servidor de WebSockets, configurada para tomar el valor desde las variables de entorno
// o usar un valor por defecto para desarrollo
const SOCKET_URL =
  process.env.NEXT_PUBLIC_SOCKET_URL || 'http://localhost:3001';

// Opciones de configuración del socket
const socketOptions = {
  autoConnect: false, // No conectar automáticamente, lo haremos manualmente
  reconnection: true, // Intentar reconectar en caso de desconexión
  reconnectionAttempts: 10, // Aumentamos el número máximo de intentos de reconexión
  reconnectionDelay: 1000, // Tiempo inicial entre intentos de reconexión (milisegundos)
  reconnectionDelayMax: 10000, // Máximo tiempo entre intentos
  timeout: 15000, // Aumentamos el tiempo de espera máximo para la conexión (milisegundos)
  transports: ['websocket', 'polling'], // Usar websocket primero, luego polling como fallback
  forceNew: true // Forzar una nueva conexión cada vez
};

// Crear instancia del socket
export const socket = io(SOCKET_URL, socketOptions);

// Debug mode flag - set to false in production
const DEBUG = process.env.NODE_ENV === 'development' && false;

// Debug función que imprime el estado del socket - solo en modo debug
export const logSocketState = () => {
  if (!DEBUG) return;
  console.log('Socket state:', {
    id: socket.id,
    connected: socket.connected,
    disconnected: socket.disconnected,
    auth: socket.auth
  });
};

// Add minimal event handlers for important functionality
if (typeof window !== 'undefined') {
  // Critical handler for messages that require chat restoration
  socket.on('message_received', message => {
    // Always emit restore_deleted_chat to ensure the chat is visible
    // for the current user, regardless of whether it was previously deleted
    socket.emit('restore_deleted_chat', message.chatId);

    // Join the chat channel to receive future messages
    socket.emit('join_chat', {
      chatId: message.chatId,
      userId: socket.auth?.userId
    });
  });

  // Only add extensive logging in debug mode
  if (DEBUG) {
    socket.onAny((event, ...args) => {
      console.log(`[Socket Event] ${event}:`, args);
    });

    socket.on('connect', () => {
      console.log('[IMPORTANT] Socket connected with ID:', socket.id);
      logSocketState();
    });

    socket.on('connect_error', error => {
      console.error('[IMPORTANT] Socket connection error:', error);
      logSocketState();
    });

    socket.on('disconnect', reason => {
      console.warn('[IMPORTANT] Socket disconnected:', reason);
      logSocketState();
    });
  }
}

// Función para conectar el socket con autenticación
export const connectSocket = (token: string, userId?: string) => {
  // Si ya está conectado, no hacer nada
  if (socket.connected) return;

  // Configurar el token de autenticación y el userId
  socket.auth = { token, userId };

  // Conectar al servidor
  socket.connect();

  // Al conectarse exitosamente, notificar que estamos en línea
  socket.on('connect', () => {
    // El token contiene información del usuario, podemos extraer el userId
    const userId = (socket.auth as any)?.userId;

    // Emitir evento de presencia inmediatamente después de conectar
    if (userId) {
      socket.emit('update_presence', {
        userId,
        isOnline: true
      });
    }
  });
};

// Función para desconectar el socket
export const disconnectSocket = () => {
  if (socket.connected) {
    socket.disconnect();
  }
};

// Unirse a un chat
export const joinChat = (chatId: string) => {
  if (socket.connected) {
    socket.emit('join_chat', { chatId, userId: socket.auth?.userId });
  }
};

// Enviar un mensaje
export const sendMessage = (
  content: string,
  senderId: string,
  chatId: string,
  replyToId?: string
) => {
  return new Promise((resolve, reject) => {
    if (!socket.connected) {
      reject(new Error('No conectado al servidor'));
      return;
    }

    // Preparar el mensaje
    const messageData = {
      content,
      senderId,
      chatId,
      replyToId
    };

    // Enviar mensaje
    socket.emit('new_message', messageData);
    resolve(true);
  });
};

// Indicar que el usuario está escribiendo
export const sendTypingNotification = (
  chatId: string,
  userId: string,
  userName: string
) => {
  if (socket.connected) {
    socket.emit('typing', { chatId, userId, userName });
  }
};

// Exportar el socket como valor por defecto
export default socket;
