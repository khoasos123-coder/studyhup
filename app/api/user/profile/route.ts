import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

export async function PATCH(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const { displayName, avatarUrl, isStudent } = body;

    const updatedUser = await prisma.user.update({
      where: { id: session.user.id },
      data: {
        ...(displayName ? { displayName } : {}),
        avatarUrl: avatarUrl || null,
        ...(typeof isStudent === "boolean" ? { isStudent } : {}),
      },
    });

    return NextResponse.json(updatedUser);
  } catch (error: any) {
    console.error("Lỗi cập nhật profile:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}