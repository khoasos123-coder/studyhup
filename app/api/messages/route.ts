import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

// Lấy danh sách tin nhắn
export async function GET(req: NextRequest) {
  try {
    const session = await auth();
    const { searchParams } = new URL(req.url);
    const roomId = searchParams.get("roomId");
    const receiverId = searchParams.get("receiverId");
    const currentUserId = session?.user?.id || searchParams.get("currentUserId");

    let query = supabase
      .from("messages")
      .select("*")
      .order("created_at", { ascending: true })
      .limit(50);

    if (roomId) {
      query = query.eq("room_id", roomId);
    } else if (receiverId && currentUserId) {
      // Dùng cú pháp .in() an toàn tuyệt đối, không lo lỗi cú pháp PostgREST
      query = query
        .in("sender_id", [currentUserId, receiverId])
        .in("receiver_id", [currentUserId, receiverId]);
    } else {
      return NextResponse.json([]);
    }

    const { data, error } = await query;
    if (error) {
      console.error("Lỗi Supabase GET:", error);
      return NextResponse.json([]);
    }

    return NextResponse.json(Array.isArray(data) ? data : []);
  } catch (error) {
    console.error("Lỗi GET messages:", error);
    return NextResponse.json([]);
  }
}

// Lưu tin nhắn mới
export async function POST(req: NextRequest) {
  try {
    const session = await auth();
    const body = await req.json();
    const { content, receiverId, roomId, senderId, senderName, senderAvatar } = body;

    // Lấy ID từ session hoặc từ client gửi kèm
    const finalSenderId = session?.user?.id || senderId;
    const finalSenderName = session?.user?.name || senderName || "Học viên";
    const finalSenderAvatar = session?.user?.image || senderAvatar || null;

    if (!finalSenderId) {
      return NextResponse.json({ error: "Không xác định được danh tính người gửi" }, { status: 401 });
    }

    if (!content || !content.trim()) {
      return NextResponse.json({ error: "Nội dung tin nhắn trống" }, { status: 400 });
    }

    const { data, error } = await supabase
      .from("messages")
      .insert([
        {
          sender_id: finalSenderId,
          sender_name: finalSenderName,
          sender_avatar: finalSenderAvatar,
          receiver_id: receiverId || null,
          room_id: roomId || (receiverId ? null : "study_room"),
          content: content.trim(),
        },
      ])
      .select()
      .single();

    if (error) {
      console.error("Lỗi Supabase Insert:", error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json(data);
  } catch (error: any) {
    console.error("Lỗi POST messages:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}