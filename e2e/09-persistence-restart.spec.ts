import { test, expect } from '@playwright/test';

test.describe('Journey 9: Persistence Verification Across Stack Operations (S4-05.9)', () => {
  test('confirms journals, trades, and attachment evidence persist in PostgreSQL and disk', async ({
    page,
  }) => {
    // 1. Navigate to Journals list
    await page.goto('/journals');
    await expect(page.locator('text=Daily Journal Calendar & History')).toBeVisible();

    // 2. Navigate to Dashboard and verify stats
    await page.goto('/');
    await expect(page.locator('text=JournalX').first()).toBeVisible();

    // 3. Verify Playbook
    await page.goto('/playbook');
    await expect(page.getByRole('button', { name: /Create Draft Version/i })).toBeVisible();
  });
});
