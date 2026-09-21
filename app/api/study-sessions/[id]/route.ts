import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { Rank } from '@prisma/client';

// Bảng mốc giờ quy đổi Rank tự động
function calculateRank(totalHours: number): Rank {
  if (totalHours >= 500) return 'CHALLENGER';    // Thách Đấu: >= 500h
  if (totalHours >= 350) return 'GRANDMASTER';   // Đại Cao Thủ: >= 350h
  if (totalHours >= 200) return 'MASTER';        // Cao Thủ: >= 200h
  if (totalHours >= 100) return 'DIAMOND';       // Kim Cương: >= 100h
  if (totalHours >= 50) return 'PLATINUM';       // Bạch Kim: >= 50h
  if (totalHours >= 25) return 'GOLD';           // Vàng: >= 25h
  if (totalHours >= 10) return 'SILVER';         // Bạc: >= 10h
  if (totalHours >= 1) return 'BRONZE';          // Đồng: >= 1h
  return 'UNRANKED';                             // Dưới 1h: Chưa xếp hạng
}

export async function PATCH(
  req: Request,
  context: { params: Promise<{ id: string }> | { id: string } }
) {
  try {
    const params = await context.params;
    const sessionId = params.id;

    if (!sessionId) {
      return NextResponse.json({ error: 'Thiếu ID phiên học' }, { status: 400 });
    }

    const body = await req.json();

    const session = await prisma.studySession.findUnique({
      where: { id: sessionId },
      include: { user: true },
    });

    if (!session) {
      return NextResponse.json({ error: 'Không tìm thấy phiên học' }, { status: 404 });
    }

    // XỬ LÝ KẾT THÚC PHIÊN HỌC (END)
    if (body.type === 'END') {
      const validSeconds = body.validSeconds || 0;
      const validMinutes = Math.floor(validSeconds / 60);
      const addedHours = Number((validSeconds / 3600).toFixed(3));

      // 1. Cập nhật phiên học
      const updatedSession = await prisma.studySession.update({
        where: { id: sessionId },
        data: {
          status: 'COMPLETED',
          endTime: new Date(),
          durationMinutes: validMinutes,
        },
      });

      // 2. Tính toán tổng giờ mới và Rank mới
      const currentTotalHours = session.user.totalHours || 0;
      const newTotalHours = Number((currentTotalHours + addedHours).toFixed(2));
      const newRank = calculateRank(newTotalHours);

      // 3. Cập nhật lại thông tin User trong Database
      const updatedUser = await prisma.user.update({
        where: { id: session.userId },
        data: {
          totalHours: newTotalHours,
          weeklyHours: { increment: addedHours },
          currentRank: newRank,
          lastStudyDate: new Date(),
        },
        select: {
          id: true,
          username: true,
          displayName: true,
          totalHours: true,
          currentRank: true,
          avatarUrl: true,
          isStudent: true,
        },
      });

      // Trả về cả dữ liệu phiên học và dữ liệu User đã được cập nhật
      return NextResponse.json({
        session: updatedSession,
        user: {
          ...updatedUser,
          secondsStudiedToday: validSeconds,
        },
      });
    }

    // XỬ LÝ TẠM DỪNG (PAUSE)
    if (body.type === 'PAUSE') {
      const updatedSession = await prisma.studySession.update({
        where: { id: sessionId },
        data: { status: 'PAUSED' },
      });
      return NextResponse.json({ session: updatedSession });
    }

    // XỬ LÝ TIẾP TỤC (RESUME)
    if (body.type === 'RESUME') {
      const updatedSession = await prisma.studySession.update({
        where: { id: sessionId },
        data: { status: 'RUNNING' },
      });
      return NextResponse.json({ session: updatedSession });
    }

    return NextResponse.json({ message: 'Event ignored' });
  } catch (error) {
    console.error('LỖI CẬP NHẬT PHIÊN HỌC:', error);
    return NextResponse.json(
      { error: 'Không thể cập nhật phiên học', details: String(error) },
      { status: 500 }
    );
  }
}