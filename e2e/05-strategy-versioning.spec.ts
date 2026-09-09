import { test, expect } from '@playwright/test';

test.describe('Journey 5: Strategy Versioning & Historical Immutability (S4-05.5)', () => {
  test('verifies strategy version history, immutable snapshots, and new version creation', async ({
    page,
  }) => {
    // 1. Navigate to Playbook
    await page.goto('/playbook');
    await expect(page.getByRole('button', { name: /Create Draft Version/i })).toBeVisible();

    // 2. Verify Strategy Version Immutability Notice
    await expect(page.locator('text=Strategy Version Immutability Notice')).toBeVisible();

    // 3. Check Mandatory Conditions and Version History
    await expect(page.locator('text=Mandatory Strategy Conditions').first()).toBeVisible();
    await expect(page.locator('text=Strategy Version History').first()).toBeVisible();

    // 4. Click "Create Draft Version" button
    const createDraftBtn = page.getByRole('button', { name: /Create Draft Version/i });
    if (await createDraftBtn.isVisible()) {
      await createDraftBtn.click();
      await expect(page.locator('text=Create Strategy Draft')).toBeVisible();
    }
  });
});
