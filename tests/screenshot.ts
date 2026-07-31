/**
 * Design review captures. Run with `npm run screens` while the dev server is up.
 * Writes PNGs to .screens/ — look at them, then fix what's wrong.
 */
import { chromium, type Page } from '@playwright/test';
import { mkdir } from 'node:fs/promises';

const BASE = process.env.BASE_URL ?? 'http://localhost:5183';
const OUT = '.screens';

/** side, the line, its weight, and the answer that comes back at it */
type Item = ['pro' | 'con', string, number, [string, number]?];

const SEED = {
  question: 'Should I leave the job?',
  branches: [
    {
      label: 'Take the offer',
      note: 'The pay is better and the team ships every week. I would be starting over on trust, and I would miss the people here.',
      ledger: [
        ['pro', 'Better pay — 22% on base, and the review cycle is twice a year', 4, ['Rent there eats most of it', 3]],
        ['pro', 'They ship every week', 5],
        ['con', 'Starting over on trust with a team I have never met', 3],
      ] as Item[],
    },
    {
      label: 'Stay and renegotiate',
      note: 'Cheapest to try. If the answer is no, I have learned something real.',
      ledger: [
        ['pro', 'Keep the people I like', 4],
        ['con', 'Same ceiling next year', 3],
      ] as Item[],
    },
    { label: 'Leave with nothing lined up', note: '', ledger: [] as Item[] },
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
    // the view follows a card out from under the panel, so bring the whole map back first
    await page.getByRole('button', { name: 'fit view' }).click();
    await page.waitForTimeout(400);
    await page.locator('.node-card').filter({ hasText: SEED.question }).first().click();
    await page.getByRole('button', { name: '+ Branch from here' }).click();
    await page.getByLabel('Name this branch').fill(branch.label);
    if (branch.note) await page.getByLabel('Your thinking here').fill(branch.note);

    if (branch.ledger.length) {
      await page.getByRole('button', { name: "What's for it, what's against" }).click();
      for (const [side, text, weight, answer] of branch.ledger) {
        await page.getByRole('button', { name: side === 'pro' ? '+ Add a pro' : '+ Add a con' }).click();
        const row = page.locator(`.ledger__side--${side} .ledger__item`).last();
        await row.locator('.ledger__text').fill(text);
        await row.getByRole('radio', { name: String(weight), exact: true }).click();
        if (answer) {
          await row.getByRole('button', { name: side === 'pro' ? 'But…' : 'Even so…' }).click();
          const counter = row.locator('.counter').last();
          await counter.locator('.counter__text').fill(answer[0]);
          await counter.getByRole('radio', { name: String(answer[1]), exact: true }).click();
        }
      }
      await page.keyboard.press('Escape');
    }

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
  await page.getByRole('button', { name: 'fit view' }).click();
  await page.waitForTimeout(700);
  await page.screenshot({ path: `${OUT}/${tag}-canvas-${theme}.png` });

  await page.locator('.node-card').filter({ hasText: 'Take the offer' }).click();
  await page.waitForTimeout(400);
  await page.screenshot({ path: `${OUT}/${tag}-panel-${theme}.png` });

  await page.getByRole('button', { name: "What's for it, what's against" }).click();
  await page.waitForTimeout(400);
  await page.screenshot({ path: `${OUT}/${tag}-branch-${theme}.png` });
  await page.keyboard.press('Escape');

  await page.keyboard.press('Escape');
  await page.getByRole('button', { name: 'fit view' }).click();
  await page.waitForTimeout(400);
  await page.locator('.node-card').filter({ hasText: SEED.question }).first().click();
  await page.getByRole('button', { name: 'Compare branches' }).click();
  await page.waitForTimeout(500);
  await page.screenshot({ path: `${OUT}/${tag}-compare-${theme}.png` });
  await page.keyboard.press('Escape');

  // the finished decision, with the editing put away
  await page.getByRole('button', { name: 'Decide' }).click();
  await page.getByRole('button', { name: 'fit view' }).click();
  await page.waitForTimeout(400);
  // the root wears the standing by now, so match the option card itself
  await page.locator('.node-card--option').filter({ hasText: 'Take the offer' }).click();
  await page.waitForTimeout(500);
  await page.screenshot({ path: `${OUT}/${tag}-decide-${theme}.png` });

  await browser.close();
}

await mkdir(OUT, { recursive: true });
await capture('dark', 1440, 900, 'desktop');
await capture('light', 1440, 900, 'desktop');
await capture('dark', 390, 844, 'mobile');
console.log(`captures written to ${OUT}/`);
