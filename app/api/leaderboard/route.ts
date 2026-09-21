import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET() {
  try {
    const topUsers = await prisma.user.findMany({
      take: 50,
      orderBy: [
        { totalHours: 'desc' },
        { streakCount: 'desc' },
      ],
      select: {
        id: true,
        displayName: true,
        username: true,
        avatarUrl: true,
        currentRank: true,
        totalHours: true,
        weeklyHours: true,
        streakCount: true,
      },
    });

    return NextResponse.json(topUsers);
  } catch (error) {
    console.error('LỖI LẤY BẢNG XẾP HẠNG:', error);
    return NextResponse.json({ error: 'Không thể tải bảng xếp hạng' }, { status: 500 });
  }
}