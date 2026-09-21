import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Lấy các phiên học đang RUNNING có cập nhật trong 15 phút gần nhất
    const fifteenMinutesAgo = new Date(Date.now() - 15 * 60 * 1000);

    const activeSessions = await prisma.studySession.findMany({
      where: {
        status: "RUNNING",
        updatedAt: { gte: fifteenMinutesAgo },
      },
      include: {
        user: {
          select: {
            id: true,
            displayName: true,
            username: true,
            avatarUrl: true,
            currentRank: true,
          },
        },
        snapshots: {
          orderBy: { capturedAt: "desc" },
          take: 1,
          select: {
            id: true,
            imageUrl: true,
            capturedAt: true,
            presenceVerified: true,
          },
        },
      },
      orderBy: { startTime: "desc" },
      take: 30,
    });

    // Chuẩn hóa dữ liệu trả về client
    const peers = activeSessions.map((s) => ({
      sessionId: s.id,
      subjectTag: s.subjectTag,
      startTime: s.startTime,
      user: s.user,
      latestSnapshot: s.snapshots[0] || null,
    }));

    return NextResponse.json(peers);
  } catch (error) {
    console.error("Lỗi lấy danh sách học viên trực tuyến:", error);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 }
    );
  }
}