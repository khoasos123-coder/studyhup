'use client';

import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  formatHours,
  formatHoursShort,
  getRankProgress,
} from '@/lib/rank-calculator';
import { cn } from '@/lib/utils';

export function RankProgressCard({
  totalHours,
  className,
}: {
  totalHours: number;
  className?: string;
}) {
  const p = getRankProgress(totalHours);
  const currentLabel = p.current?.label ?? 'Chưa xếp hạng';
  const icon = p.current?.tierIcon ?? '🎓';

  return (
    <Card className={cn('overflow-hidden', className)}>
      <div
        className="h-1.5 w-full"
        style={{
          background: `linear-gradient(90deg, ${p.current?.tierGradient[0] ?? '#9CA3AF'}, ${
            p.current?.tierGradient[1] ?? '#4B5563'
          })`,
        }}
      />
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center justify-between text-base">
          <span className="flex items-center gap-2">
            <span className="text-2xl leading-none">{icon}</span>
            <span>{currentLabel}</span>
          </span>
          <Badge variant="secondary" className="font-mono">
            {formatHoursShort(p.totalHours)}
          </Badge>
        </CardTitle>
      </CardHeader>

      <CardContent className="space-y-3">
        <Progress value={p.percent} className="h-2" />

        <div className="flex items-center justify-between text-xs text-muted-foreground">
          <span className="font-mono">
            {formatHours(p.hoursIntoLevel)} / {formatHours(p.hoursInLevel)}
          </span>
          <span>{p.percent.toFixed(1)}%</span>
        </div>

        {p.inUndefinedGap ? (
          <p className="text-xs text-amber-600 dark:text-amber-400">
            Bạn đang ở vùng chưa có bậc rank (600h–1000h). Còn{' '}
            <strong>{formatHours(p.hoursToNext)}</strong> nữa để đạt{' '}
            <strong>Chiến Thần</strong>.
          </p>
        ) : p.next ? (
          <p className="text-xs text-muted-foreground">
            Còn <strong className="text-foreground">{formatHours(p.hoursToNext)}</strong> để lên{' '}
            <strong className="text-foreground">
              {p.next.tierIcon} {p.next.label}
            </strong>
          </p>
        ) : (
          <p className="text-xs text-muted-foreground">
            Bạn đã đạt cấp cao nhất có thể tích luỹ bằng giờ. 🎉
          </p>
        )}
      </CardContent>
    </Card>
  );
}