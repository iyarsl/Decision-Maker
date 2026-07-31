/**
 * Design review captures. Run with `npm run screens` while the dev server is up.
 * Writes PNGs to .screens/ — look at them, then fix what's wrong.
 */
import { chromium, type Page } from '@playwright/test';
import { mkdir } from 'node:fs/promises';

const BASE = process.env.BASE_URL ?? 'http://localhost:5183';
const OUT = '.screens';

const SEED = {
  question: 'Should I leave the job?',
  branches: [
    {
      label: 'Take the offer',
      note: 'The pay is better and the team ships every week. I would be starting over on trust, and I would miss the people here.',
    },
    { label: 'Stay and renegotiate', note: 'Cheapest to try. If the answer is no, I have learned something real.' },
    { label: 'Leave with nothing lined up', note: '' },
  ],
};

async function build(page: Page) {
  await page.goto(BASE);
  await page.evaluate(() => {
    window.localStorage.clear();
    // the walkthrough would otherwise cover the very thing being captured
    window.localStorage.setItem(
      'decision-maker:guide:v1',
      JSON.stringify({ state: { active: false, step: 0, seen: true }, version: 0 }),
    );
  });
  await page.reload();
  await page.getByLabel('What are you deciding?').fill(SEED.question);

  for (const branch of SEED.branches) {
    await page.locator('.node-card').filter({ hasText: SEED.question }).first().click();
    await page.getByRole('button', { name: '+ Branch from here' }).click();
    await page.getByLabel('Name this branch').fill(branch.label);
    if (branch.note) await page.getByLabel('Your thinking here').fill(branch.note);
    await page.keyboard.press('Escape');
  }
}

async function capture(theme: 'dark' | 'light', width: number, height: number, tag: string) {
  const browser = await chromium.launch();
  const page = await browser.newPage({
    viewport: { width, height },
    colorScheme: theme,
    deviceScaleFactor: 2,
  });

  await build(page);
  await page.waitForTimeout(700);
  await page.screenshot({ path: `${OUT}/${tag}-canvas-${theme}.png` });

  await page.locator('.node-card').filter({ hasText: 'Take the offer' }).click();
  await page.waitForTimeout(400);
  await page.screenshot({ path: `${OUT}/${tag}-panel-${theme}.png` });

  await page.keyboard.press('Escape');
  await page.locator('.node-card').filter({ hasText: SEED.question }).first().click();
  await page.getByRole('button', { name: 'Compare options' }).click();
  const sheet = page.getByRole('dialog', { name: 'Compare options' });
  const weights = sheet.getByRole('slider');
  await weights.nth(0).fill('3');
  await weights.nth(1).fill('9');
  const score = (option: string, criterion: string, label: string) =>
    sheet
      .getByRole('radiogroup', { name: `${option} on ${criterion}` })
      .getByRole('radio', { name: label, exact: true })
      .click();
  await score('Take the offer', 'What it costs me', 'Con');
  await score('Take the offer', 'What it gives me', 'Strong pro');
  await score('Stay and renegotiate', 'What it costs me', 'Pro');
  await score('Stay and renegotiate', 'What it gives me', 'Slight con');
  await score('Leave with nothing lined up', 'What it costs me', 'Strong con');
  await page.waitForTimeout(500);
  await page.screenshot({ path: `${OUT}/${tag}-grid-${theme}.png` });

  await browser.close();
}

await mkdir(OUT, { recursive: true });
await capture('dark', 1440, 900, 'desktop');
await capture('light', 1440, 900, 'desktop');
await capture('dark', 390, 844, 'mobile');
console.log(`captures written to ${OUT}/`);
