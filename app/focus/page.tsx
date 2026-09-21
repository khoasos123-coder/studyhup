import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { auth } from '@/auth';
import { prisma } from '@/lib/prisma';
import { FocusStudyDashboard } from '@/components/study/focus-study-dashboard';

export const metadata: Metadata = {
  title: 'Focus Study | StudyHup',
};

export default async function FocusPage() {
  const session = await auth();

  // Nếu chưa đăng nhập, đá về trang login (Middleware cũng đã chặn, nhưng để chắc chắn)
  if (!session?.user?.id) {
    redirect('/login');
  }

  // Lấy dữ liệu thật từ Database
  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: {
      id: true,
      username: true,
      displayName: true,
      totalHours: true,
      // Tạm thời tính giờ học hôm nay = 0, sau này sẽ query bảng StudySession
    }
  });

  if (!user) {
    redirect('/login');
  }

  // Giả lập số giây đã học hôm nay (sau này sẽ query thật)
  const secondsStudiedToday = 0; 

  return (
    <FocusStudyDashboard 
      user={{
        ...user,
        secondsStudiedToday
      }} 
    />
  );
}