import { nextRunIso, normalizeCron } from '@/lib/cron/utils';

export function computeNextRunAt(scheduleCron: string | null | undefined): string | null {
  const cron = normalizeCron(scheduleCron);
  return nextRunIso(cron);
}


