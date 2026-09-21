import { NextResponse } from 'next/server';
import { z } from 'zod';
import { auth } from '@/auth';
import { prisma } from '@/lib/prisma';

const createSchema = z.object({
  verifyMode: z.enum(['WEBCAM', 'SCREEN_SHARE']),
  subjectTag: z.string().max(50).optional(),
});

// 1. API LẤY LỊCH SỬ CÁC PHIÊN HỌC (Hiển thị lên Sidebar)
export async function GET() {
  try {
    const sessionAuth = await auth();
    let userId = sessionAuth?.user?.id;

    if (!userId) {
      const existingUser = await prisma.user.findFirst();
      userId = existingUser?.id;
    }

    if (!userId) {
      return NextResponse.json([], { status: 200 });
    }

    const sessions = await prisma.studySession.findMany({
      where: { userId },
      orderBy: { startTime: 'desc' },
      take: 30, // Lấy 30 phiên gần nhất
      select: {
        id: true,
        subjectTag: true,
        startTime: true,
        durationMinutes: true,
        status: true,
        verifyMode: true,
      },
    });

    return NextResponse.json(sessions);
  } catch (error) {
    console.error('LỖI LẤY LỊCH SỬ PHIÊN HỌC:', error);
    return NextResponse.json([], { status: 500 });
  }
}

// 2. API TẠO PHIÊN HỌC MỚI
export async function POST(req: Request) {
  try {
    const sessionAuth = await auth();
    let userId = sessionAuth?.user?.id;

    if (!userId) {
      const existingUser = await prisma.user.findFirst();
      if (existingUser) {
        userId = existingUser.id;
      } else {
        const defaultUser = await prisma.user.create({
          data: {
            email: 'studyhup@example.com',
            username: 'studyhup_user',
            displayName: 'Học Viên StudyHup',
            totalHours: 0,
            weeklyHours: 0,
          },
        });
        userId = defaultUser.id;
      }
    }

    const body = await req.json().catch(() => ({}));
    const parsed = createSchema.safeParse(body);
    const verifyMode = parsed.success ? parsed.data.verifyMode : 'SCREEN_SHARE';
    const subjectTag = parsed.success && parsed.data.subjectTag ? parsed.data.subjectTag : 'Lập trình';

    const newSession = await prisma.studySession.create({
      data: {
        userId,
        verifyMode,
        subjectTag,
        status: 'RUNNING',
        startTime: new Date(),
        lastHeartbeatAt: new Date(),
      },
      select: {
        id: true,
        startTime: true,
      },
    });

    return NextResponse.json(newSession, { status: 201 });
  } catch (error) {
    console.error('LỖI TẠO PHIÊN HỌC:', error);
    return NextResponse.json(
      { error: 'Lỗi tạo phiên học', details: String(error) },
      { status: 500 }
    );
  }
}