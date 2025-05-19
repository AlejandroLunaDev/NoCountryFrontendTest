import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

interface User {
  id: string;
  name: string | null;
  email?: string | null; // email is optional here
}

interface ChatMemberFromSupabase {
  id: string;
  userId: string;
  chatId: string;
  users: User[];
}

export async function GET(
  request: Request,
  { params }: { params: { chatId: string } }
) {
  try {
    const supabase = createClient();
    const chatId = params.chatId;

    // Verificar si el usuario está autenticado
    const {
      data: { session }
    } = await supabase.auth.getSession();
    if (!session) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    // Verificar si el usuario es miembro del chat
    const { data: membership, error: membershipError } = await supabase
      .from('chat_members')
      .select()
      .eq('userId', session.user.id)
      .eq('chatId', chatId)
      .single();

    if (membershipError || !membership) {
      return NextResponse.json(
        { error: 'No autorizado para ver este chat' },
        { status: 403 }
      );
    }

    // Obtener detalles del chat
    const { data: chat, error: chatError } = await supabase
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
      .eq('id', chatId)
      .single();

    if (chatError) {
      console.error('Error al obtener chat:', chatError);
      return NextResponse.json(
        { error: 'Error al obtener el chat' },
        { status: 500 }
      );
    }

    // Formatear miembros
    const formattedChat = {
      ...chat,
      members: chat.members.map((member: ChatMemberFromSupabase) => ({
        id: member.id,
        userId: member.userId,
        chatId: member.chatId,
        name: member.users[0]?.name || 'Usuario'
      }))
    };

    return NextResponse.json(formattedChat);
  } catch (error) {
    console.error('Error en la ruta de obtención de chat por ID:', error);
    return NextResponse.json({ error: 'Error del servidor' }, { status: 500 });
  }
}
