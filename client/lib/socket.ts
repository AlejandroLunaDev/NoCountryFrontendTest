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

// Debug función que imprime el estado del socket
export const logSocketState = () => {
  console.log('Socket state:', {
    id: socket.id,
    connected: socket.connected,
    disconnected: socket.disconnected,
    auth: socket.auth
  });
};

// Debug eventos
if (typeof window !== 'undefined') {
  socket.onAny((event, ...args) => {
    console.log(`[Socket Event] ${event}:`, args);
  });

  // Add specific listeners for debugging critical events
  socket.on('notification', notification => {
    console.log('[IMPORTANT] Notification received:', notification);
  });

  socket.on('message_received', message => {
    console.log('[IMPORTANT] Message received:', message);
    // If message is for a chat that was deleted, emit an event to trigger rechecking chats
    socket.emit('check_chat_exists', message.chatId);
  });

  socket.on('chat_created', chat => {
    console.log('[IMPORTANT] Chat created/restored:', chat);
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

  socket.on('reconnect', attemptNumber => {
    console.log(
      '[IMPORTANT] Socket reconnected after',
      attemptNumber,
      'attempts'
    );
    logSocketState();
  });

  socket.on('reconnect_attempt', attemptNumber => {
    console.log('[IMPORTANT] Socket reconnect attempt:', attemptNumber);
  });

  socket.on('reconnect_error', error => {
    console.error('[IMPORTANT] Socket reconnect error:', error);
  });

  socket.on('reconnect_failed', () => {
    console.error('[IMPORTANT] Socket reconnect failed after max attempts');
  });

  // Debug API requests
  const originalFetch = window.fetch;
  window.fetch = async function (input, init) {
    const url = typeof input === 'string' ? input : input.url;

    if (url.includes('/api/')) {
      console.log('[API Request]', {
        url,
        method: init?.method || 'GET',
        body: init?.body ? JSON.parse(init.body.toString()) : undefined
      });

      try {
        const response = await originalFetch(input, init);
        const responseClone = response.clone();

        try {
          const data = await responseClone.json();
          console.log('[API Response]', { url, status: response.status, data });
        } catch (e) {
          console.log('[API Response]', {
            url,
            status: response.status,
            text: 'No JSON body'
          });
        }

        return response;
      } catch (error) {
        console.error('[API Error]', { url, error });
        throw error;
      }
    }

    return originalFetch(input, init);
  };
}

// Función para conectar el socket con autenticación
export const connectSocket = (token: string) => {
  // Si ya está conectado, no hacer nada
  if (socket.connected) return;

  // Configurar el token de autenticación
  socket.auth = { token };

  // Conectar al servidor
  socket.connect();
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
    socket.emit('join_chat', chatId);
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
