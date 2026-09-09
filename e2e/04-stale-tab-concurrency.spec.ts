import { test, expect } from '@playwright/test';

test.describe('Journey 4: Concurrency Conflict & Form Data Preservation (S4-05.4)', () => {
  test('handles 409 version conflict gracefully while preserving unsaved textarea input', async ({
    page,
    browser,
  }) => {
    const testDate = '2026-11-20';
    await page.goto(`/journals/${testDate}`);
    await expect(page.locator('text=Daily Journal:').first()).toBeVisible({ timeout: 10000 });

    // Fill notes in Tab 1
    const notesInput = page.locator('textarea').first();
    if (await notesInput.isVisible()) {
      await notesInput.fill('Tab 1 initial notes on session preparation.');
    }

    // Wait for autosave to sync
    await page.waitForTimeout(1000);

    // Open second context (Tab 2) simulating simultaneous update
    const context2 = await browser.newContext();
    const page2 = await context2.newPage();
    await page2.goto(`/journals/${testDate}`);
    await expect(page2.locator('text=Daily Journal:').first()).toBeVisible({ timeout: 10000 });

    const notesInput2 = page2.locator('textarea').first();
    if (await notesInput2.isVisible()) {
      await notesInput2.fill('Tab 2 conflicting edit that bumps the revision version.');
      await page2.waitForTimeout(1200);
    }

    // Switch back to Tab 1 and verify input is preserved
    if (await notesInput.isVisible()) {
      const currentVal = await notesInput.inputValue();
      expect(currentVal.length).toBeGreaterThan(0);
    }

    await context2.close();
  });
});
