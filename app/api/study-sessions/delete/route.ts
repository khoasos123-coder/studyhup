import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export async function DELETE(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const sessionId = searchParams.get("id");
    const clearAll = searchParams.get("all") === "true";

    if (sessionId) {
      // 1. Xóa 1 phiên cụ thể của user
      const { error } = await supabase
        .from("study_sessions")
        .delete()
        .eq("id", sessionId)
        .eq("user_id", session.user.id);

      if (error) throw error;
      return NextResponse.json({ success: true, deletedId: sessionId });
    }

    if (clearAll) {
      // 2. Xóa toàn bộ lịch sử học tập của user
      const { error } = await supabase
        .from("study_sessions")
        .delete()
        .eq("user_id", session.user.id);

      if (error) throw error;
      return NextResponse.json({ success: true, cleared: true });
    }

    return NextResponse.json({ error: "Thiếu tham số yêu cầu" }, { status: 400 });
  } catch (error: any) {
    console.error("Lỗi xóa phiên học:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}