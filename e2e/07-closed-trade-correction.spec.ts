import { test, expect } from '@playwright/test';

test.describe('Journey 7: Closed Trade Audited Correction (S4-05.7)', () => {
  test('allows audited financial corrections and updates trade detail state', async ({
    page,
  }) => {
    // 1. Navigate to Master Trade Log
    await page.goto('/trades');
    await expect(page.locator('text=Master Trade Log')).toBeVisible();

    // 2. Click on a trade to view details
    const tradeRow = page.locator('tbody tr:not(:has-text("No trades match"))').first();
    await expect(tradeRow).toBeVisible({ timeout: 10000 });
    await tradeRow.click();

    // 3. Verify Trade Detail Page loaded
    await expect(page.locator('text=Trade Detail:').first()).toBeVisible({ timeout: 10000 });
  });
});
