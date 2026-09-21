import { NextResponse } from 'next/server';

/**
 * Endpoint chạy AI Presence phía server.
 * Hiện tại là stub — thay bằng model thật (MediaPipe / TFJS / dịch vụ ngoài).
 */
export async function POST() {
  return NextResponse.json(
    { error: 'NOT_IMPLEMENTED', message: 'Dùng detectPresence() phía client hoặc tích hợp model.' },
    { status: 501 },
  );
}