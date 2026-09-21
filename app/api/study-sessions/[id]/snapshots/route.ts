import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { createClient } from '@supabase/supabase-js';

// Khởi tạo Supabase Client để đẩy file vào Storage
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

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
    const file = formData.get('file') as Blob | null;
    const capturedAtStr = formData.get('capturedAt') as string | null;
    const presenceVerified = formData.get('presenceVerified') === 'true';

    const captureTime = capturedAtStr ? new Date(capturedAtStr) : new Date();

    // 1. Cập nhật mốc thời gian heartbeat của phiên học
    await prisma.studySession.update({
      where: { id: sessionId },
      data: {
        lastHeartbeatAt: captureTime,
      },
    });

    // 2. Nếu có file ảnh gửi lên, tiến hành lưu vào Storage và Database
    if (file) {
      const arrayBuffer = await file.arrayBuffer();
      const buffer = Buffer.from(arrayBuffer);
      
      // Đặt tên file theo định dạng: sessionId/timestamp.jpg
      const filePath = `${sessionId}/${Date.now()}.jpg`;

      // Đẩy ảnh lên Supabase Storage bucket 'snapshots'
      const { error: uploadError } = await supabase.storage
        .from('snapshots')
        .upload(filePath, buffer, {
          contentType: 'image/jpeg',
          upsert: true,
        });

      if (uploadError) {
        console.error('Lỗi đẩy ảnh lên Supabase Storage:', uploadError);
      } else {
        // Lấy link công khai của ảnh
        const { data: urlData } = supabase.storage
          .from('snapshots')
          .getPublicUrl(filePath);

        // Lưu thông tin ảnh vào bảng sessionSnapshot
        await prisma.sessionSnapshot.create({
          data: {
            sessionId: sessionId,
            imageUrl: urlData.publicUrl,
            capturedAt: captureTime,
            presenceVerified: presenceVerified,
          },
        });
      }
    }

    return NextResponse.json({
      success: true,
      sessionId,
      capturedAt: captureTime,
      presenceVerified,
    });
  } catch (error) {
    console.error('LỖI LƯU SNAPSHOT:', error);
    return NextResponse.json({ error: 'Không thể lưu snapshot' }, { status: 500 });
  }
}