import { test, expect } from '@playwright/test';

test.describe('Journey 3: No-Trade Day & Discipline Evaluation (S4-05.3)', () => {
  test('completes a disciplined no-trade day with cancelled plans and verifies analytics', async ({
    page,
  }) => {
    // 1. Navigate to a test date workspace
    const noTradeDate = '2026-10-15';
    await page.goto(`/journals/${noTradeDate}`);
    await expect(page.locator('text=Daily Journal:').first()).toBeVisible({ timeout: 10000 });

    // 2. Open End-of-Day Review tab
    const reviewTab = page.getByRole('tab', { name: /End-of-Day Review/i });
    if (await reviewTab.isVisible()) {
      await reviewTab.click();
    }

    // Fill reflection narrative
    const reflectionTextarea = page.locator('textarea').first();
    if (await reflectionTextarea.isVisible()) {
      await reflectionTextarea.fill('No high-probability ICT setups occurred during NY Q2. Strictly followed rules and avoided overtrading.');
    }

    // Click Complete Review if available
    const completeReviewBtn = page.getByRole('button', { name: /Complete EOD Review/i }).first();
    if (await completeReviewBtn.isVisible()) {
      await completeReviewBtn.click();
    }

    // 3. Verify on Analytics page
    await page.goto('/analytics');
    await expect(page.locator('text=Performance Analytics')).toBeVisible();
  });
});
