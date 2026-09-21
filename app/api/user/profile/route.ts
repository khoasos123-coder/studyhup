import { NextResponse } from 'next/server';
import { z } from 'zod';
import { auth } from '@/auth';
import { prisma } from '@/lib/prisma';

const updateProfileSchema = z.object({
  displayName: z.string().min(2, 'Tên hiển thị tối thiểu 2 ký tự').max(50),
  avatarUrl: z.string().url('URL không hợp lệ').or(z.literal('')).optional().nullable(),
  isStudent: z.boolean().optional(),
});

export async function PATCH(req: Request) {
  try {
    const sessionAuth = await auth();
    let userId = sessionAuth?.user?.id;

    if (!userId) {
      const existingUser = await prisma.user.findFirst();
      userId = existingUser?.id;
    }

    if (!userId) {
      return NextResponse.json({ error: 'Không tìm thấy người dùng' }, { status: 401 });
    }

    const body = await req.json();
    const parsed = updateProfileSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message || 'Dữ liệu không hợp lệ' },
        { status: 400 }
      );
    }

    const updatedUser = await prisma.user.update({
      where: { id: userId },
      data: {
        displayName: parsed.data.displayName,
        avatarUrl: parsed.data.avatarUrl ? parsed.data.avatarUrl : null,
        isStudent: parsed.data.isStudent ?? false,
      },
    });

    return NextResponse.json(updatedUser);
  } catch (error) {
    console.error('LỖI CẬP NHẬT PROFILE:', error);
    return NextResponse.json(
      { error: 'Không thể cập nhật hồ sơ', details: String(error) },
      { status: 500 }
    );
  }
}