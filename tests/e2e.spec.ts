import { expect, test, type Page } from '@playwright/test';

const QUESTION = 'Should I leave the job?';

/** a clean decision with the first-run walkthrough already dismissed */
async function fresh(page: Page) {
  await page.goto('/');
  await page.evaluate(() => {
    window.localStorage.clear();
    window.localStorage.setItem(
      'decision-maker:guide:v1',
      JSON.stringify({ state: { active: false, step: 0, seen: true }, version: 0 }),
    );
  });
  await page.reload();
  await page.getByLabel('What are you deciding?').fill(QUESTION);
}

/** click a node card by its visible label */
const nodeCard = (page: Page, label: string) => page.locator('.node-card').filter({ hasText: label });

async function addBranch(page: Page, parentLabel: string, childLabel: string) {
  await nodeCard(page, parentLabel).first().click();
  await page.getByRole('button', { name: '+ Branch from here' }).click();
  await page.getByLabel('Name this branch').fill(childLabel);
  await page.keyboard.press('Escape');
}

test('map a decision, write into it, and weigh the options', async ({ page }) => {
  await fresh(page);

  // the root node mirrors the question
  await expect(nodeCard(page, QUESTION)).toBeVisible();

  // a node takes as many branches as the decision needs
  await addBranch(page, QUESTION, 'Take the offer');
  await addBranch(page, QUESTION, 'Stay and renegotiate');
  await addBranch(page, QUESTION, 'Leave with nothing lined up');
  await expect(page.locator('.node-card')).toHaveCount(4);

  // writing reasoning resolves a branch; its siblings stay in the fog
  await nodeCard(page, 'Take the offer').click();
  await page.getByLabel('Your thinking here').fill('The pay is better and the team ships. I would miss the people here.');
  await expect(nodeCard(page, 'Take the offer')).toHaveClass(/is-resolved/);
  await expect(nodeCard(page, 'Stay and renegotiate')).toHaveClass(/is-unresolved/);

  // clarity meter counts written branches (1 of 4)
  await expect(page.locator('.clarity__label .data')).toHaveText('1/4');

  // the grid opens from the node and seeds itself with that node's branches
  await nodeCard(page, QUESTION).click();
  await page.getByRole('button', { name: 'Compare options' }).click();
  const sheet = page.getByRole('dialog', { name: 'Compare options' });
  await expect(sheet).toBeVisible();
  await expect(sheet.locator('.option-head__label')).toHaveCount(3);

  // weights: 2 / 8 / 5
  const weights = sheet.getByRole('slider');
  await weights.nth(0).fill('2');
  await weights.nth(1).fill('8');
  await weights.nth(2).fill('5');

  const score = async (option: string, criterion: string, label: string) => {
    await sheet
      .getByRole('radiogroup', { name: `${option} on ${criterion}` })
      .getByRole('radio', { name: label, exact: true })
      .click();
  };

  // Take the offer:        -2*2 + 3*8 + 1*5  = 25
  await score('Take the offer', 'What it costs me', 'Con');
  await score('Take the offer', 'What it gives me', 'Strong pro');
  await score('Take the offer', 'How it feels in a year', 'Slight pro');
  // Stay and renegotiate:   3*2 + -1*8 + 1*5 = 3
  await score('Stay and renegotiate', 'What it costs me', 'Strong pro');
  await score('Stay and renegotiate', 'What it gives me', 'Slight con');
  await score('Stay and renegotiate', 'How it feels in a year', 'Slight pro');

  await expect(sheet.locator('.option-head.is-winner .option-head__label')).toHaveValue('Take the offer');
  await expect(sheet.locator('.readout')).toContainText('leads by 22');
  await expect(sheet.locator('.readout')).toContainText('What it gives me');

  // closing stamps the verdict back onto the node it belongs to
  await sheet.getByRole('button', { name: 'Done' }).click();
  await expect(nodeCard(page, QUESTION).locator('.node-card__verdict')).toContainText('Take the offer');
});

test('autosaves, exports, and reopens a decision file', async ({ page }, testInfo) => {
  await fresh(page);
  await addBranch(page, QUESTION, 'Take the offer');
  await addBranch(page, QUESTION, 'Stay and renegotiate');

  // autosave survives a reload
  await page.reload();
  await expect(page.getByLabel('What are you deciding?')).toHaveValue(QUESTION);
  await expect(page.locator('.node-card')).toHaveCount(3);

  const download = await Promise.all([
    page.waitForEvent('download'),
    page.getByRole('button', { name: 'Export' }).click(),
  ]).then(([event]) => event);
  const file = testInfo.outputPath('decision.json');
  await download.saveAs(file);

  // start over, then reopen the file
  page.on('dialog', (dialog) => dialog.accept());
  await page.getByRole('button', { name: 'New' }).click();
  await expect(page.locator('.node-card')).toHaveCount(1);

  await page.locator('input[type="file"]').setInputFiles(file);
  await expect(page.getByLabel('What are you deciding?')).toHaveValue(QUESTION);
  await expect(page.locator('.node-card')).toHaveCount(3);
  await expect(nodeCard(page, 'Stay and renegotiate')).toBeVisible();
});

test('branches can be deleted, the decision itself cannot', async ({ page }) => {
  await fresh(page);
  await addBranch(page, QUESTION, 'Take the offer');
  await addBranch(page, QUESTION, 'Stay and renegotiate');
  await addBranch(page, 'Take the offer', 'It is the team they described');
  await expect(page.locator('.node-card')).toHaveCount(4);

  // deleting a branch takes everything hanging off it
  await nodeCard(page, 'Take the offer').first().click();
  await page.getByRole('button', { name: 'Delete branch' }).click();
  await expect(page.locator('.node-card')).toHaveCount(2);

  // the Delete key does the same to whatever is selected, panel open included
  await nodeCard(page, 'Stay and renegotiate').click();
  await expect(page.locator('.panel')).toBeVisible();
  await page.keyboard.press('Delete');
  await expect(page.locator('.node-card')).toHaveCount(1);
  await expect(page.locator('.panel')).toHaveCount(0);

  // a branch just added sits with the caret in its empty name — Delete still means the branch
  await nodeCard(page, QUESTION).first().click();
  await page.getByRole('button', { name: '+ Branch from here' }).click();
  await expect(page.locator('.node-card')).toHaveCount(2);
  await expect(page.getByLabel('Name this branch')).toBeFocused();
  await page.keyboard.press('Delete');
  await expect(page.locator('.node-card')).toHaveCount(1);

  // typing in a field keeps the key for the text
  await addBranch(page, QUESTION, 'Wait six months');
  await nodeCard(page, 'Wait six months').click();
  await page.getByLabel('Name this branch').click();
  await page.keyboard.press('Delete');
  await expect(page.locator('.node-card')).toHaveCount(2);
  await page.keyboard.press('Escape');
  await nodeCard(page, 'Wait six months').click();
  await page.keyboard.press('Delete');
  await expect(page.locator('.node-card')).toHaveCount(1);

  // the decision itself has no delete, by button or by key
  await page.locator('.node-card').first().click();
  await expect(page.getByRole('button', { name: 'Delete branch' })).toHaveCount(0);
  await page.keyboard.press('Escape');
  await page.locator('.node-card').first().click();
  await page.keyboard.press('Delete');
  await expect(page.locator('.node-card')).toHaveCount(1);
});

test('double-click makes a card on empty canvas only, and Hebrew text sets its own direction', async ({
  page,
}) => {
  await fresh(page);
  await addBranch(page, QUESTION, 'לקחת את ההצעה');

  // a Hebrew branch reads right to left; its English sibling is untouched
  await expect(nodeCard(page, 'לקחת את ההצעה').locator('.node-card__label')).toHaveCSS('direction', 'rtl');
  await expect(nodeCard(page, QUESTION).locator('.node-card__label')).toHaveCSS('direction', 'ltr');

  // double-clicking a card opens it instead of dropping a stray card behind it
  await nodeCard(page, 'לקחת את ההצעה').dblclick();
  await expect(page.locator('.node-card')).toHaveCount(2);
  await expect(page.locator('.panel')).toBeVisible();

  // empty canvas still makes one
  await page.locator('.react-flow__pane').dblclick({ position: { x: 120, y: 620 } });
  await expect(page.locator('.node-card')).toHaveCount(3);
});

test('the walkthrough starts on a first visit and follows the work', async ({ page }) => {
  await page.goto('/');
  await page.evaluate(() => window.localStorage.clear());
  await page.reload();

  const guide = page.locator('.guide__card');
  await expect(guide).toBeVisible();
  await expect(guide.locator('.guide__title')).toHaveText('Map it, write it, weigh it');

  await page.getByRole('button', { name: 'Show me' }).click();
  await expect(guide.locator('.guide__title')).toHaveText('Name the decision');
  await expect(guide.locator('.guide__check')).toContainText('Try it now');

  // the step ticks itself off when the user actually does it
  await page.getByLabel('What are you deciding?').fill(QUESTION);
  await expect(guide.locator('.guide__check')).toContainText('Done');
  await page.getByRole('button', { name: 'Next' }).click();
  await expect(guide.locator('.guide__title')).toHaveText('Open a card');

  // and steps that move the interface carry themselves forward
  await page.locator('.node-card').first().click();
  await expect(guide.locator('.guide__title')).toHaveText('Write your thinking');

  await page.getByRole('button', { name: 'End the walkthrough' }).click();
  await expect(guide).toHaveCount(0);

  // dismissed for good, but still reachable from the header
  await page.reload();
  await page.waitForTimeout(1400);
  await expect(page.locator('.guide__card')).toHaveCount(0);
  await page.getByRole('button', { name: 'Guide' }).click();
  await expect(page.locator('.guide__card')).toBeVisible();
});

test('ctrl-click holds several branches and they travel together', async ({ page }) => {
  await fresh(page);
  await addBranch(page, QUESTION, 'Take the offer');
  await addBranch(page, QUESTION, 'Stay and renegotiate');
  await addBranch(page, QUESTION, 'Wait six months');

  await nodeCard(page, 'Take the offer').click();
  await nodeCard(page, 'Stay and renegotiate').click({ modifiers: ['Control'] });
  await expect(page.locator('.react-flow__node.selected')).toHaveCount(2);
  await expect(page.locator('.canvas-hint__selection')).toContainText('2 branches held');
  // two cards give the panel nothing single to say, and one toolbar is enough
  await expect(page.locator('.panel')).toHaveCount(0);
  await expect(page.locator('.node-tools')).toHaveCount(0);

  const held = (await nodeCard(page, 'Take the offer').boundingBox())!;
  const dragged = (await nodeCard(page, 'Stay and renegotiate').boundingBox())!;
  const left = (await nodeCard(page, 'Wait six months').boundingBox())!;

  await page.mouse.move(dragged.x + dragged.width / 2, dragged.y + 14);
  await page.mouse.down();
  await page.mouse.move(dragged.x + dragged.width / 2 - 200, dragged.y + 160, { steps: 12 });
  await page.mouse.up();

  const heldNow = (await nodeCard(page, 'Take the offer').boundingBox())!;
  const draggedNow = (await nodeCard(page, 'Stay and renegotiate').boundingBox())!;
  const leftNow = (await nodeCard(page, 'Wait six months').boundingBox())!;

  // both selected cards move by the same delta; the unselected one stays put
  expect(Math.abs(draggedNow.x - dragged.x)).toBeGreaterThan(150);
  expect(Math.abs(heldNow.x - held.x - (draggedNow.x - dragged.x))).toBeLessThan(4);
  expect(Math.abs(heldNow.y - held.y - (draggedNow.y - dragged.y))).toBeLessThan(4);
  expect(Math.abs(leftNow.x - left.x)).toBeLessThan(2);

  // ctrl-drag across empty canvas boxes a selection instead of panning
  await page.locator('.react-flow__pane').click({ position: { x: 40, y: 40 } });
  await expect(page.locator('.react-flow__node.selected')).toHaveCount(0);
  await page.mouse.move(30, 120);
  await page.keyboard.down('Control');
  await page.mouse.down();
  await page.mouse.move(1240, 700, { steps: 14 });
  await page.mouse.up();
  await page.keyboard.up('Control');
  await expect(page.locator('.react-flow__node.selected')).toHaveCount(4);
});

test('align puts the map back on one grid, and undo takes it back', async ({ page }) => {
  await fresh(page);
  await addBranch(page, QUESTION, 'Take the offer');
  await addBranch(page, QUESTION, 'Stay and renegotiate');
  await page.waitForTimeout(600);

  const positions = () =>
    page.evaluate(() =>
      JSON.parse(window.localStorage.getItem('decision-maker:v1')!).state.doc.nodes.map(
        (node: { position: { x: number; y: number } }) => [
          Math.round(node.position.x),
          Math.round(node.position.y),
        ],
      ),
    );

  // scatter one branch, then align
  const card = nodeCard(page, 'Stay and renegotiate');
  const box = (await card.boundingBox())!;
  await page.mouse.move(box.x + box.width / 2, box.y + 14);
  await page.mouse.down();
  await page.mouse.move(box.x + box.width / 2 - 240, box.y + 220, { steps: 10 });
  await page.mouse.up();
  const scattered = await positions();

  await page.getByRole('button', { name: 'Align branches' }).click();
  const aligned = await positions();
  // one column per depth, siblings a row apart
  expect(new Set(aligned.map(([x]: number[]) => x)).size).toBe(2);
  expect(Math.abs(aligned[1][1] - aligned[2][1])).toBe(166);

  await expect(page.locator('.undo__label')).toHaveText('Branches aligned');
  await page.getByRole('button', { name: 'Undo' }).click();
  expect(await positions()).toEqual(scattered);
  await expect(page.locator('.undo')).toHaveCount(0);
});

test('a branch can be fed by several, and survives losing one of them', async ({ page }) => {
  await fresh(page);
  await addBranch(page, QUESTION, 'Take the offer');
  await addBranch(page, QUESTION, 'Stay and renegotiate');
  await addBranch(page, 'Take the offer', 'Burn out again');
  await page.waitForTimeout(700); // the view settles before handles are where they look

  const handle = async (label: string, kind: 'source' | 'target') => {
    const box = (await page
      .locator('.react-flow__node', { hasText: label })
      .first()
      .locator(`.react-flow__handle.${kind}`)
      .boundingBox())!;
    return { x: box.x + box.width / 2, y: box.y + box.height / 2 };
  };

  const from = await handle('Stay and renegotiate', 'source');
  const to = await handle('Burn out again', 'target');
  await page.mouse.move(from.x, from.y);
  await page.mouse.down();
  await page.mouse.move(to.x, to.y, { steps: 14 });
  await page.mouse.up();
  await expect(page.locator('.react-flow__edge')).toHaveCount(4);

  // the outcome now hangs off both options, so deleting one leaves it standing
  await nodeCard(page, 'Take the offer').click();
  await page.getByRole('button', { name: 'Delete branch' }).click();
  await expect(page.locator('.node-card')).toHaveCount(3);
  await expect(nodeCard(page, 'Burn out again')).toBeVisible();
  await expect(page.locator('.undo__label')).toContainText('Deleted Take the offer');
  await page.getByRole('button', { name: 'Undo' }).click();
  await expect(page.locator('.node-card')).toHaveCount(4);
});

test('the canvas pans, zooms, and moves nodes', async ({ page }) => {
  await fresh(page);
  const viewport = page.locator('.react-flow__viewport');
  const before = await viewport.getAttribute('style');

  await page.getByRole('button', { name: 'zoom in' }).click();
  await expect(viewport).not.toHaveAttribute('style', before ?? '');

  // drag the root node somewhere else
  const card = page.locator('.node-card').first();
  const box = (await card.boundingBox())!;
  await page.mouse.move(box.x + box.width / 2, box.y + 12);
  await page.mouse.down();
  await page.mouse.move(box.x + box.width / 2 + 160, box.y + 90, { steps: 12 });
  await page.mouse.up();

  const moved = (await card.boundingBox())!;
  expect(Math.abs(moved.x - box.x)).toBeGreaterThan(60);
});
