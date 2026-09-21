import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function POST(
  req: Request,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id: sessionId } = await context.params;

    if (!sessionId) {
      return NextResponse.json({ error: 'Thiếu ID phiên học' }, { status: 400 });
    }

    const formData = await req.formData();
    const capturedAtStr = formData.get('capturedAt') as string | null;
    const presenceVerified = formData.get('presenceVerified') === 'true';

    // Cập nhật mốc thời gian heartbeat của phiên học
    await prisma.studySession.update({
      where: { id: sessionId },
      data: {
        lastHeartbeatAt: capturedAtStr ? new Date(capturedAtStr) : new Date(),
      },
    });

    return NextResponse.json({
      id: sessionId,
      capturedAt: new Date(),
      presenceVerified,
    });
  } catch (error) {
    console.error('LỖI LƯU SNAPSHOT:', error);
    return NextResponse.json({ error: 'Không thể lưu snapshot' }, { status: 500 });
  }
}