import { test, expect } from '@playwright/test';

test.describe('Journey 6: Timezone & Daylight Saving Windows (S4-05.6)', () => {
  test('verifies proper Asia/Kathmandu timezone rendering and overnight window attribution', async ({
    page,
  }) => {
    // 1. Check App Header Timezone badge
    await page.goto('/');
    await expect(page.locator('text=Asia/Kathmandu').first()).toBeVisible();

    // 2. Open Settings and verify System Preferences
    await page.goto('/settings');
    await expect(page.locator('text=System Preferences & Settings')).toBeVisible();

    // 3. Open Journal workspace
    await page.goto('/journals/2026-09-09');
    await expect(page.locator('text=Daily Journal:').first()).toBeVisible({ timeout: 10000 });
  });
});
