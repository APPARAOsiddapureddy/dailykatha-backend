import cron from 'node-cron';
import { generateTodaysPicks } from './todaysPicks.js';

export function startCronJobs() {
  // 00:00 IST = 18:30 UTC previous day
  cron.schedule(
    '30 18 * * *',
    async () => {
      console.log("[Cron] Starting daily Today's Picks generation...");
      try {
        const result = await generateTodaysPicks();
        console.log("[Cron] Today's Picks done:", { generated: result.generated.length, failed: result.failed.length });
      } catch (e) {
        console.error("[Cron] Today's Picks failed:", e.message);
      }
    },
    { timezone: 'UTC' },
  );

  console.log("[Cron] Jobs scheduled: Today's Picks at 00:00 IST daily");
}

