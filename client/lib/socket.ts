import { io } from 'socket.io-client';

// URL del servidor de WebSockets, configurada para tomar el valor desde las variables de entorno
// o usar un valor por defecto para desarrollo
const SOCKET_URL =
  process.env.NEXT_PUBLIC_SOCKET_URL || 'http://localhost:3001';

// Opciones de configuración del socket
const socketOptions = {
  autoConnect: false, // No conectar automáticamente, lo haremos manualmente
  reconnection: true, // Intentar reconectar en caso de desconexión
  reconnectionAttempts: 5, // Número máximo de intentos de reconexión
  reconnectionDelay: 1000, // Tiempo entre intentos de reconexión (milisegundos)
  timeout: 10000 // Tiempo de espera máximo para la conexión (milisegundos)
};

// Crear instancia del socket
export const socket = io(SOCKET_URL, socketOptions);

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
