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
    const currentUserId = session?.user?.id;

    // 1. Lấy tất cả người dùng trong hệ thống
    const { data: rawUsers, error: userError } = await supabase
      .from("users")
      .select("*");

    if (userError) {
      console.error("Lỗi truy vấn users:", userError);
      return NextResponse.json([]);
    }

    // 2. Lấy danh sách các tài khoản đang có phiên học RUNNING (Online)
    const { data: activeSessions } = await supabase
      .from("study_sessions")
      .select("user_id, status")
      .eq("status", "RUNNING");

    const onlineUserIds = new Set(
      (activeSessions || []).map((s: any) => s.user_id)
    );

    // 3. Chuẩn hóa dữ liệu và lọc bỏ tài khoản của chính mình
    const peers = (rawUsers || [])
      .filter((u: any) => u.id !== currentUserId)
      .map((u: any) => ({
        id: u.id,
        displayName: u.displayName || u.display_name || u.name || u.username || "Học viên",
        username: u.username || "user",
        avatarUrl: u.avatarUrl || u.avatar_url || u.image || null,
        isOnline: onlineUserIds.has(u.id),
      }));

    // Sắp xếp: Ai Online lên đầu, ai Offline ở dưới
    peers.sort((a, b) => {
      if (a.isOnline === b.isOnline) {
        return a.displayName.localeCompare(b.displayName);
      }
      return a.isOnline ? -1 : 1;
    });

    return NextResponse.json(peers);
  } catch (error) {
    console.error("Lỗi GET /api/chat/peers:", error);
    return NextResponse.json([]);
  }
}