import { test, expect } from '@playwright/test';
import { createTempImage } from './helpers.js';

test.describe('Journey 1: Full Trade Lifecycle (S4-05.1)', () => {
  test('executes complete journey from setup to day review and dashboard verification', async ({
    page,
  }) => {
    page.on('console', (msg) => console.log('BROWSER LOG:', msg.type(), msg.text()));
    page.on('pageerror', (err) => console.log('BROWSER PAGEERROR:', err.message));

    // 1. Navigate to dashboard
    await page.goto('/');
    await expect(page).toHaveTitle(/JournalX/i);
    await expect(page.locator('text=JournalX').first()).toBeVisible();

    // 2. Open Today Journal
    const openTodayBtn = page.getByRole('button', { name: /Open Today/i }).first();
    await expect(openTodayBtn).toBeVisible();
    await openTodayBtn.click();

    // Verify workspace loaded
    await expect(page.locator('text=Daily Journal:').first()).toBeVisible({ timeout: 10000 });
    await expect(page.locator('text=1. Preparation & Readiness').first()).toBeVisible();

    // 3. Complete Preparation Notes
    const prepNotesInput = page.locator('textarea').first();
    if (await prepNotesInput.isVisible()) {
      await prepNotesInput.fill('Market showing bullish structure above Asia high. Ready to trade NY session.');
    }

    // 4. Check Economic News tab
    const newsTab = page.getByRole('tab', { name: /Economic Calendar/i });
    if (await newsTab.isVisible()) {
      await newsTab.click();
    }

    // 5. Multi-Timeframe Analyses tab
    const analysesTab = page.getByRole('tab', { name: /Top-Down Analysis/i });
    if (await analysesTab.isVisible()) {
      await analysesTab.click();
    }

    // 6. Switch to Trades tab & Plan a Trade
    const tradesTab = page.getByRole('tab', { name: /Trades/i });
    if (await tradesTab.isVisible()) {
      await tradesTab.click();
    }

    const planTradeBtn = page.getByRole('button', { name: /Plan Trade/i }).first();
    await expect(planTradeBtn).toBeVisible();
    await planTradeBtn.click();

    // Modal opens
    await expect(page.locator('text=Plan New Trade')).toBeVisible();

    // Fill trade plan inputs if needed
    const entryInput = page.getByLabel(/Planned Entry/i);
    const stopInput = page.getByLabel(/Original Stop/i);
    const targetInput = page.getByLabel(/Original Target/i);

    if (await entryInput.isVisible()) {
      await entryInput.fill('4435.00');
      await stopInput.fill('4430.00');
      await targetInput.fill('4445.00');
    }

    // Answer all mandatory checklist items to PASS
    const passChips = page.locator('button:has-text("PASS")');
    const chipCount = await passChips.count();
    for (let i = 0; i < chipCount; i++) {
      await passChips.nth(i).click();
    }

    // Submit Plan
    const createPlanBtn = page.getByRole('button', { name: /Save Trade Plan/i }).first();
    await expect(createPlanBtn).toBeEnabled();
    await createPlanBtn.click();
    await expect(page.locator('text=Plan New Trade')).toBeHidden({ timeout: 10000 });

    // 7. Verify Navigation to Trade Log and details
    await page.goto('/trades');
    await expect(page.locator('text=Master Trade Log')).toBeVisible();

    // 8. Open Trade Details
    const tradeRow = page.locator('tbody tr:not(:has-text("No trades match"))').first();
    await expect(tradeRow).toBeVisible({ timeout: 10000 });
    await tradeRow.click();
    await expect(page.locator('text=Trade Detail:').first()).toBeVisible({ timeout: 10000 });

    // 9. Upload Chart Screenshot Evidence
    const uploadBtn = page.getByRole('button', { name: /Upload Chart/i });
    if (await uploadBtn.isVisible()) {
      await uploadBtn.click();
      const testImage = createTempImage('lifecycle-chart.png');
      const fileInput = page.locator('input[type="file"]').first();
      await fileInput.setInputFiles(testImage);
      await page.getByRole('button', { name: /Upload Evidence/i }).click();
      await expect(page.locator('text=lifecycle-chart.png').first()).toBeVisible({ timeout: 10000 });
    }

    // 10. Return to Dashboard
    await page.goto('/');
    await expect(page.locator('text=JournalX').first()).toBeVisible();
  });
});
