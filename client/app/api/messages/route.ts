import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

// Obtener mensajes
export async function GET(request: Request) {
  try {
    const supabase = createClient();

    // Obtener la URL y parámetros
    const url = new URL(request.url);
    const chatId = url.searchParams.get('chatId');

    if (!chatId) {
      return NextResponse.json(
        { error: 'Se requiere un ID de chat' },
        { status: 400 }
      );
    }

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
        { error: 'No autorizado para ver los mensajes de este chat' },
        { status: 403 }
      );
    }

    // Obtener mensajes del chat
    const { data: messages, error: messagesError } = await supabase
      .from('messages')
      .select(
        `
        id,
        content,
        senderId,
        chatId,
        createdAt,
        replyToId,
        sender:users(id, name)
      `
      )
      .eq('chatId', chatId)
      .order('createdAt', { ascending: true });

    if (messagesError) {
      console.error('Error al obtener mensajes:', messagesError);
      return NextResponse.json(
        { error: 'Error al obtener los mensajes' },
        { status: 500 }
      );
    }

    return NextResponse.json(messages);
  } catch (error) {
    console.error('Error en la ruta de obtención de mensajes:', error);
    return NextResponse.json({ error: 'Error del servidor' }, { status: 500 });
  }
}

// Enviar un mensaje
export async function POST(request: Request) {
  try {
    const supabase = createClient();

    // Verificar si el usuario está autenticado
    const {
      data: { session }
    } = await supabase.auth.getSession();
    if (!session) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    // Obtener datos de la petición
    const body = await request.json();
    const { chatId, content, senderId, replyToId } = body;

    if (!chatId || !content || !senderId) {
      return NextResponse.json(
        { error: 'Faltan campos requeridos' },
        { status: 400 }
      );
    }

    // Verificar que el usuario sea el remitente
    if (senderId !== session.user.id) {
      return NextResponse.json(
        { error: 'No puedes enviar mensajes como otro usuario' },
        { status: 403 }
      );
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
        { error: 'No autorizado para enviar mensajes a este chat' },
        { status: 403 }
      );
    }

    // Crear el mensaje
    const { data: message, error: messageError } = await supabase
      .from('messages')
      .insert([
        {
          content,
          senderId,
          chatId,
          replyToId: replyToId || null
        }
      ])
      .select(
        `
        id,
        content,
        senderId,
        chatId,
        createdAt,
        replyToId,
        sender:users(id, name)
      `
      )
      .single();

    if (messageError) {
      console.error('Error al crear mensaje:', messageError);
      return NextResponse.json(
        { error: 'Error al enviar el mensaje' },
        { status: 500 }
      );
    }

    return NextResponse.json(message);
  } catch (error) {
    console.error('Error en la ruta de envío de mensajes:', error);
    return NextResponse.json({ error: 'Error del servidor' }, { status: 500 });
  }
}
