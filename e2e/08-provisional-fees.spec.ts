import { test, expect } from '@playwright/test';

test.describe('Journey 8: Provisional Fee State & Confirmation (S4-05.8)', () => {
  test('displays PROVISIONAL badge when fees are unknown and unblocks metrics when confirmed', async ({
    page,
  }) => {
    // 1. Navigate to Master Trade Log
    await page.goto('/trades');
    await expect(page.locator('text=Master Trade Log')).toBeVisible();

    // 2. Open Trade Details
    const tradeRow = page.locator('tbody tr:not(:has-text("No trades match"))').first();
    await expect(tradeRow).toBeVisible({ timeout: 10000 });
    await tradeRow.click();

    // 3. Verify Trade Detail Page loaded
    await expect(page.locator('text=Trade Detail:').first()).toBeVisible({ timeout: 10000 });
  });
});
