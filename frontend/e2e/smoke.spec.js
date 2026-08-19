import { test, expect } from '@playwright/test';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

test.describe('Sports Wearable smoke test', () => {
  test('login, create athlete, upload session, register PSE, verify ACWR', async ({ page }) => {
    await page.goto('/login');
    await page.fill('#login-email', 'demo@wearable.local');
    await page.fill('#login-password', 'demo1234');
    await page.click('#login-submit');
    await expect(page).toHaveURL(/\/dashboard/);

    await page.goto('/athletes/new');
    const athleteName = `E2E Athlete ${Date.now()}`;
    await page.fill('#name', athleteName);
    await page.fill('#position', 'Atacante');
    await page.fill('#birth_date', '2000-01-01');
    await page.fill('#weight_kg', '70');
    await page.fill('#height_m', '1.75');
    await page.click('button[type="submit"]');

    await expect(page).toHaveURL(/\/athletes$/);
    await expect(page.locator('td', { hasText: athleteName }).first()).toBeVisible();

    let capturedSessionId = null;
    page.on('response', async (response) => {
      if (
        response.url().includes('/api/sessions/upload') &&
        response.request().method() === 'POST'
      ) {
        try {
          const json = await response.json();
          if (json && json.session_id) {
            capturedSessionId = json.session_id;
          }
        } catch (e) {
          // ignore parsing errors
        }
      }
    });

    await page.goto('/sessions');
    await page.click('button:has-text("Upload Session")');

    const athleteSelect = page.locator('#athlete-select');
    await expect(athleteSelect).toBeEnabled();
    await athleteSelect.selectOption({ label: athleteName });

    const fixturePath = path.join(__dirname, 'fixtures', 'SESSAO_20260101_120000_E2ETEST.ndjson');
    await page.setInputFiles('#file-input', fixturePath);

    await page.locator('.upload-modal-container .upload-btn').click();
    await Promise.race([
      expect(page.locator('.upload-result-banner')).toBeVisible({ timeout: 30000 }),
      expect(page.locator('.global-error'))
        .toBeVisible({ timeout: 30000 })
        .then(async () => {
          const errorText = await page.locator('.global-error').textContent();
          throw new Error('Upload failed with global error: ' + errorText);
        }),
    ]);
    await page.click('button:has-text("Close")');

    expect(capturedSessionId).not.toBeNull();

    await page.goto(`/sessions/${capturedSessionId}`);

    const pseSelect = page.locator('#pse-select');
    await expect(pseSelect).toBeVisible();
    await pseSelect.selectOption('7');

    await page.click('button:has-text("Save PSE")');
    await expect(page.locator('text=PSE saved successfully!')).toBeVisible();

    await page.goto('/dashboard');

    const athleteCard = page.locator('.athlete-card', { hasText: athleteName });
    await expect(athleteCard).toBeVisible();

    const badge = athleteCard.locator('.acwr-badge');
    await expect(badge).toHaveText('N/D');
    await expect(badge).toHaveClass(/acwr-badge--none/);
  });
});
