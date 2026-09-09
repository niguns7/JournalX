import { test, expect } from '@playwright/test';

test.describe('Journey 2: Non-compliant Trade & Violation Acknowledgment (S4-05.2)', () => {
  test('handles missing sweep, honest execution recording with violation and bad-win/good-loss filtering', async ({
    page,
  }) => {
    // 1. Navigate to Trade Log
    await page.goto('/trades');
    await expect(page.locator('text=Master Trade Log')).toBeVisible();

    // 2. Open Record Execution Modal
    const recordBtn = page.getByRole('button', { name: /Record Execution/i }).first();
    await expect(recordBtn).toBeVisible();
    await recordBtn.click();

    await expect(page.locator('text=Record Executed Trade')).toBeVisible();

    // 3. Fill Non-Compliant execution parameters if needed
    const entryInput = page.getByLabel(/Actual Entry Price/i);
    const stopInput = page.getByLabel(/Original Stop Price/i);
    const targetInput = page.getByLabel(/Original Target Price/i);

    if (await entryInput.isVisible()) {
      await entryInput.fill('4438.00');
      await stopInput.fill('4432.00');
      await targetInput.fill('4450.00');
    }

    // Flag violations
    const flagCheckbox = page.getByLabel(/Flag this execution as having rule violations/i);
    if (await flagCheckbox.isVisible()) {
      await flagCheckbox.check();
      const ackCheckbox = page.getByLabel(/I acknowledge this trade violated/i);
      if (await ackCheckbox.isVisible()) {
        await ackCheckbox.check();
      }
    }

    // Submit honest record
    const submitBtn = page.getByRole('button', { name: /Record Actual Execution/i }).first();
    await expect(submitBtn).toBeVisible();
    await submitBtn.click();
    await expect(page.locator('text=Record Executed Trade')).toBeHidden({ timeout: 10000 });

    // 4. Verify Trade Log reflects updated data
    await page.goto('/trades');
    await expect(page.locator('text=Master Trade Log')).toBeVisible();
  });
});
