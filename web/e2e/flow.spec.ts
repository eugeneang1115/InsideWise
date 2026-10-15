import { expect, test, type Page } from '@playwright/test';

// The server must run with MODERATOR_EMAILS including this address.
const MODERATOR = process.env.E2E_MODERATOR ?? 'mod@example.test';
const PASSWORD = 'correct horse battery';
const isPhone = (page: Page) => (page.viewportSize()?.width ?? 1000) < 700;

async function signIn(page: Page, email: string, register: boolean) {
  if (register) await page.getByRole('button', { name: 'New here? Create an account' }).click();
  await page.getByLabel('Email').fill(email);
  await page.getByLabel(/^Password/).fill(PASSWORD);
  await page.getByRole('dialog').getByRole('button', { name: register ? 'Create account' : 'Sign in', exact: true }).click();
}

async function signInAsModerator(page: Page) {
  await page.goto('/#/mine');
  await page.getByRole('main').getByRole('button', { name: 'Sign in' }).click();
  await page.getByLabel('Email').fill(MODERATOR);
  await page.getByLabel(/^Password/).fill(PASSWORD);
  const login = page.waitForResponse((r) => r.url().endsWith('/api/auth/login'));
  await page.getByRole('dialog').getByRole('button', { name: 'Sign in', exact: true }).click();
  if ((await login).status() === 401) {
    await page.getByRole('button', { name: 'New here? Create an account' }).click();
    await page.getByRole('dialog').getByRole('button', { name: 'Create account', exact: true }).click();
  }
  await expect(page.getByRole('dialog')).toBeHidden();
}

test('browse, search in Chinese and open a company', async ({ page }) => {
  await page.goto('/');
  await expect(page.locator('.company-card')).toHaveCount(9);
  await page.getByRole('combobox', { name: /Language/ }).selectOption('zh');
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('入职之前，先了解职场。');
  await page.getByRole('searchbox').fill('金融');
  await expect(page.locator('.company-card')).toHaveCount(1);
  await page.locator('.company-card').first().click();
  await expect(page.getByRole('region', { name: '公司概况' }).getByRole('heading', { name: 'Teras Finance' })).toBeVisible();
  await page.getByRole('combobox', { name: /Language/ }).selectOption('en');
});

test('write a review, moderate it, and see it published', async ({ browser }, info) => {
  const run = `${info.project.name}-${Date.now()}`;
  const email = `writer-${run}@example.test`;
  const headline = `Calm team and fair workload ${run}`;
  const writer = await browser.newPage();
  await writer.goto('/#/company/selat');
  await writer.getByRole('region', { name: 'Company overview' }).getByRole('button', { name: /Write a review/ }).click();
  await expect(writer.getByText('Sign in to write a review.')).toBeVisible();
  await signIn(writer, email, true);

  // Signing in continues straight into the review form.
  const form = writer.getByRole('dialog');
  await expect(form.getByRole('heading', { name: 'Write a review' })).toBeVisible();
  await expect(form.getByLabel('Company')).toHaveValue('selat');
  for (const label of ['Overall rating', 'Pay & benefits', 'Management', 'Culture', 'Career growth', 'Work-life balance']) {
    await form.getByLabel(label).selectOption('4');
  }
  await form.getByLabel('Review headline').fill(headline);
  await form.getByLabel('What works well').fill('Reach me at me@example.com for details.');
  await form.getByLabel('What could improve').fill('Planning between departments needs more structure and notice.');
  await form.getByRole('checkbox').check();
  await form.getByRole('button', { name: 'Submit for review' }).click();
  await expect(form.getByRole('alert')).toHaveText('Remove personal contact or identity details before submitting.');
  await form.getByLabel('What works well').fill('Managers listen and the workload is planned fairly each sprint.');
  await form.getByRole('button', { name: 'Submit for review' }).click();
  await expect(writer).toHaveURL(/#\/mine/);
  await expect(writer.getByText('Pending review')).toBeVisible();

  const mod = await browser.newPage();
  await signInAsModerator(mod);
  await mod.goto('/#/moderation');
  const card = mod.locator('.review', { hasText: headline });
  await card.getByRole('button', { name: 'Publish' }).click();
  await expect(card).toHaveCount(0);

  await writer.reload();
  await expect(writer.getByText('Published', { exact: true })).toBeVisible();
  await writer.goto('/#/company/selat');
  const published = writer.locator('.detail .review', { hasText: headline });
  await expect(published).toBeVisible();
  await expect(writer.locator('.detail')).not.toContainText(email);

  await published.getByRole('button', { name: 'Report' }).click();
  await writer.getByRole('dialog').getByLabel(/Reason/).fill(`Testing the report flow ${run}.`);
  await writer.getByRole('dialog').getByRole('button', { name: 'Confirm' }).click();
  await expect(writer.locator('.toast')).toHaveText('Thanks. A moderator will look at this review.');

  await mod.reload();
  const reported = mod.locator('.review', { hasText: `Testing the report flow ${run}.` });
  await reported.getByRole('button', { name: 'Dismiss report' }).click();
  await expect(reported).toHaveCount(0);

  // Clean up so the test can run again against the same database.
  await writer.goto('/#/mine');
  await writer.getByRole('button', { name: 'Delete account' }).click();
  await writer.getByRole('dialog').getByRole('button', { name: 'Confirm' }).click();
  await expect(writer).toHaveURL(/#\/$/);
});

test('phone results sheet expands and collapses', async ({ page }) => {
  test.skip(!isPhone(page), 'phone layout only');
  await page.goto('/');
  const sheet = page.locator('aside.results');
  const toggle = page.locator('.sheet-toggle');
  await expect(sheet).toHaveClass(/snap-1/);
  await toggle.tap();
  await expect(sheet).toHaveClass(/snap-2/);
  await toggle.tap();
  await expect(sheet).toHaveClass(/snap-1/);
});
