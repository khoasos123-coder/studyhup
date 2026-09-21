import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export async function GET(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json([]);
    }

    const { searchParams } = new URL(req.url);
    const roomId = searchParams.get("roomId");
    const receiverId = searchParams.get("receiverId");

    let query = supabase
      .from("messages")
      .select("*")
      .order("created_at", { ascending: true })
      .limit(50);

    if (roomId) {
      query = query.eq("room_id", roomId);
    } else if (receiverId) {
      query = query.or(
        `and(sender_id.eq.${session.user.id},receiver_id.eq.${receiverId}),and(sender_id.eq.${receiverId},receiver_id.eq.${session.user.id})`
      );
    }

    const { data, error } = await query;
    if (error) {
      console.error("Lỗi Supabase Query:", error);
      return NextResponse.json([]);
    }

    return NextResponse.json(Array.isArray(data) ? data : []);
  } catch (error) {
    console.error("Lỗi GET messages:", error);
    return NextResponse.json([]);
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const { content, receiverId, roomId } = body;

    if (!content || !content.trim()) {
      return NextResponse.json({ error: "Nội dung rỗng" }, { status: 400 });
    }

    const { data, error } = await supabase
      .from("messages")
      .insert([
        {
          sender_id: session.user.id,
          sender_name: session.user.name || "Học viên",
          sender_avatar: session.user.image || null,
          receiver_id: receiverId || null,
          room_id: roomId || (receiverId ? null : "study_room"),
          content: content.trim(),
        },
      ])
      .select()
      .single();

    if (error) throw error;
    return NextResponse.json(data);
  } catch (error: any) {
    console.error("Lỗi POST messages:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}