'use client';

import { cn, formatClock } from '@/lib/utils';

export function SessionTimer({
  seconds,
  status,
  className,
}: {
  seconds: number;
  status: 'IDLE' | 'RUNNING' | 'PAUSED' | 'COMPLETED';
  className?: string;
}) {
  return (
    <div className={cn('flex flex-col items-center gap-2', className)}>
      <div
        className={cn(
          'font-mono text-6xl font-bold tabular-nums tracking-tight transition-colors sm:text-7xl',
          status === 'RUNNING' && 'text-emerald-500',
          status === 'PAUSED' && 'text-amber-500',
          status === 'IDLE' && 'text-muted-foreground',
          status === 'COMPLETED' && 'text-sky-500',
        )}
      >
        {formatClock(seconds)}
      </div>
      <span className="text-xs uppercase tracking-widest text-muted-foreground">
        {status === 'RUNNING' && 'Đang tính giờ'}
        {status === 'PAUSED' && 'Tạm dừng'}
        {status === 'IDLE' && 'Sẵn sàng'}
        {status === 'COMPLETED' && 'Hoàn thành'}
      </span>
    </div>
  );
}