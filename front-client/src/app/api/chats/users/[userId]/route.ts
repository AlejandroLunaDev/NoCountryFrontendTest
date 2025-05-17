import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function GET(
  request: Request,
  { params }: { params: { userId: string } }
) {
  try {
    const supabase = createClient();
    const userId = params.userId;

    // Verificar si el usuario está autenticado
    const {
      data: { session }
    } = await supabase.auth.getSession();
    if (!session) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    // Verificar que el usuario solicitado sea el mismo que está autenticado
    if (session.user.id !== userId) {
      return NextResponse.json(
        { error: 'No autorizado para ver chats de otro usuario' },
        { status: 403 }
      );
    }

    // Obtener todos los chats donde el usuario es miembro
    const { data: chatMembers, error: membersError } = await supabase
      .from('chat_members')
      .select('chatId')
      .eq('userId', userId);

    if (membersError) {
      console.error('Error al obtener miembros del chat:', membersError);
      return NextResponse.json(
        { error: 'Error al obtener chats' },
        { status: 500 }
      );
    }

    if (!chatMembers.length) {
      return NextResponse.json([]);
    }

    // Extraer IDs de chats
    const chatIds = chatMembers.map(member => member.chatId);

    // Obtener detalles de los chats
    const { data: chats, error: chatsError } = await supabase
      .from('chats')
      .select(
        `
        id,
        name,
        isGroup,
        createdAt,
        members:chat_members(
          id,
          userId,
          chatId,
          users(id, name, email)
        )
      `
      )
      .in('id', chatIds)
      .order('createdAt', { ascending: false });

    if (chatsError) {
      console.error('Error al obtener chats:', chatsError);
      return NextResponse.json(
        { error: 'Error al obtener chats' },
        { status: 500 }
      );
    }

    // Obtener el último mensaje de cada chat
    const chatsWithLastMessage = await Promise.all(
      chats.map(async chat => {
        // Consultar el último mensaje
        const { data: messages, error: messagesError } = await supabase
          .from('messages')
          .select(
            `
            id,
            content,
            senderId,
            chatId,
            createdAt,
            sender:users(id, name)
          `
          )
          .eq('chatId', chat.id)
          .order('createdAt', { ascending: false })
          .limit(1);

        if (messagesError) {
          console.error(
            `Error al obtener mensajes para chat ${chat.id}:`,
            messagesError
          );
          return {
            ...chat,
            lastMessage: null,
            members: chat.members.map((member: any) => ({
              id: member.id,
              userId: member.userId,
              chatId: member.chatId,
              name: member.users?.name || 'Usuario'
            }))
          };
        }

        return {
          ...chat,
          lastMessage: messages.length > 0 ? messages[0] : null,
          members: chat.members.map((member: any) => ({
            id: member.id,
            userId: member.userId,
            chatId: member.chatId,
            name: member.users?.name || 'Usuario'
          }))
        };
      })
    );

    return NextResponse.json(chatsWithLastMessage);
  } catch (error) {
    console.error('Error en la ruta de obtención de chats por usuario:', error);
    return NextResponse.json({ error: 'Error del servidor' }, { status: 500 });
  }
}
