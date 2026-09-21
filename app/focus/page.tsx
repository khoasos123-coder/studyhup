import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { FocusStudyDashboard } from "@/components/study/focus-study-dashboard";

export default async function FocusPage() {
  const session = await auth();
  if (!session?.user?.id) {
    redirect("/login");
  }

  const dbUser = await prisma.user.findUnique({
    where: { id: session.user.id },
  });

  if (!dbUser) {
    redirect("/login");
  }

  const initialUser = {
    id: dbUser.id,
    username: dbUser.username,
    displayName: dbUser.displayName || dbUser.username,
    totalHours: Number(dbUser.totalHours) || 0,
    secondsStudiedToday: 0,
    avatarUrl: dbUser.avatarUrl || null,
    isStudent: dbUser.isStudent ?? true,
  };

  return <FocusStudyDashboard user={initialUser} />;
}