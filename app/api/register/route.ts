import { NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import { z } from 'zod';
import { prisma } from '@/lib/prisma';

const registerSchema = z.object({
  username: z.string().min(3, 'Tên tài khoản tối thiểu 3 ký tự'),
  email: z.string().email('Email không hợp lệ'),
  password: z.string().min(6, 'Mật khẩu tối thiểu 6 ký tự'),
  displayName: z.string().min(2, 'Tên hiển thị tối thiểu 2 ký tự').optional(),
});

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const parsed = registerSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message || 'Dữ liệu không hợp lệ' },
        { status: 400 }
      );
    }

    const { username, email, password, displayName } = parsed.data;

    // Kiểm tra trùng email hoặc username
    const existingUser = await prisma.user.findFirst({
      where: {
        OR: [{ email }, { username }],
      },
    });

    if (existingUser) {
      return NextResponse.json(
        { error: 'Email hoặc tên tài khoản đã tồn tại' },
        { status: 400 }
      );
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const newUser = await prisma.user.create({
      data: {
        username,
        email,
        password: hashedPassword,
        displayName: displayName || username,
        totalHours: 0,
        weeklyHours: 0,
      },
      select: {
        id: true,
        username: true,
        email: true,
        displayName: true,
      },
    });

    return NextResponse.json(newUser, { status: 201 });
  } catch (error) {
    console.error('LỖI ĐĂNG KÝ:', error);
    return NextResponse.json(
      { error: 'Lỗi hệ thống khi đăng ký tài khoản' },
      { status: 500 }
    );
  }
}