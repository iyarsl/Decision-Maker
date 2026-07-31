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

/** list what's for and against one branch on its own page, weighting each line 1-5 */
async function weigh(page: Page, label: string, items: ['pro' | 'con', string, number][]) {
  await nodeCard(page, label).first().click();
  await page.getByRole('button', { name: "What's for it, what's against" }).click();
  const sheet = page.getByRole('dialog', { name: 'Weigh this branch' });
  await expect(sheet).toBeVisible();
  for (const [side, text, weight] of items) {
    await page.getByRole('button', { name: side === 'pro' ? '+ Add a pro' : '+ Add a con' }).click();
    const row = page.locator(`.ledger__side--${side} .ledger__item`).last();
    await row.locator('.ledger__text').fill(text);
    await row.getByRole('radio', { name: String(weight), exact: true }).click();
  }
  // out of the page, then out of the panel
  await page.keyboard.press('Escape');
  await expect(sheet).toHaveCount(0);
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

  // clarity counts the written branch and the decision card, which is a fork, not a claim
  await expect(page.locator('.clarity__label .data')).toHaveText('2/4');

  // each branch carries its own case: Take the offer nets 5+3-2 = +6
  await weigh(page, 'Take the offer', [
    ['pro', 'Better pay', 5],
    ['pro', 'Ships weekly', 3],
    ['con', 'Starting over on trust', 2],
  ]);
  // the card shows which way the weight sits and how much is listed — not a total
  const offerCard = nodeCard(page, 'Take the offer');
  await expect(offerCard.locator('.balance__count--for')).toHaveText('2 for');
  await expect(offerCard.locator('.balance__count--against')).toHaveText('1 against');
  await expect(offerCard.locator('.balance__side--for')).toBeVisible();

  // Stay and renegotiate nets 4-3 = +1
  await weigh(page, 'Stay and renegotiate', [
    ['pro', 'Keep the people', 4],
    ['con', 'Same ceiling next year', 3],
  ]);
  await expect(nodeCard(page, 'Stay and renegotiate').locator('.balance__count--for')).toHaveText('1 for');

  // compare reads those lists — nothing is typed twice
  await nodeCard(page, QUESTION).first().click();
  await page.getByRole('button', { name: 'Compare branches' }).click();
  const sheet = page.getByRole('dialog', { name: 'Compare branches' });
  await expect(sheet).toBeVisible();
  await expect(sheet.locator('.compare-col')).toHaveCount(3);
  await expect(sheet.locator('.compare-col.is-leading .compare-col__label')).toHaveText('Take the offer');
  await expect(sheet.locator('.readout')).toContainText('is ahead by 5');
  await expect(sheet.locator('.readout')).toContainText('Better pay');
  await expect(sheet.locator('.readout')).toContainText('1 branch has nothing listed yet');

  // closing stamps the standing back onto the card the branches hang off
  await sheet.getByRole('button', { name: 'Done' }).click();
  await expect(nodeCard(page, QUESTION).first().locator('.node-card__verdict')).toContainText(
    'Take the offer',
  );
});

test('rating a line is optional — an unrated one still counts, as one', async ({ page }) => {
  await fresh(page);
  await addBranch(page, QUESTION, 'Take the offer');

  await nodeCard(page, 'Take the offer').click();
  await page.getByRole('button', { name: "What's for it, what's against" }).click();
  const sheet = page.getByRole('dialog', { name: 'Weigh this branch' });

  // two pros, neither rated: a plain tally
  await page.getByRole('button', { name: '+ Add a pro' }).click();
  await sheet.locator('.ledger__side--pro .ledger__item').last().locator('.ledger__text').fill('Better pay');
  await page.getByRole('button', { name: '+ Add a pro' }).click();
  await sheet.locator('.ledger__side--pro .ledger__item').last().locator('.ledger__text').fill('Ships weekly');
  await expect(sheet.locator('.ledger__weight.is-unrated')).toHaveCount(2);
  await expect(sheet.locator('.ledger__figures strong')).toHaveText('net +2');

  // rating one says more; clicking the same step again takes the rating back off
  const first = sheet.locator('.ledger__side--pro .ledger__item').first();
  await first.getByRole('radio', { name: '4', exact: true }).click();
  await expect(sheet.locator('.ledger__figures strong')).toHaveText('net +5');
  await first.getByRole('radio', { name: '4', exact: true }).click();
  await expect(sheet.locator('.ledger__figures strong')).toHaveText('net +2');
});

test('Enter starts the next line, shift+Enter breaks this one', async ({ page }) => {
  await fresh(page);
  await addBranch(page, QUESTION, 'Take the offer');

  await nodeCard(page, 'Take the offer').click();
  await page.getByRole('button', { name: "What's for it, what's against" }).click();
  const sheet = page.getByRole('dialog', { name: 'Weigh this branch' });
  const pros = sheet.locator('.ledger__side--pro .ledger__item');

  await page.getByRole('button', { name: '+ Add a pro' }).click();
  await page.keyboard.type('Better pay');
  await page.keyboard.press('Enter');
  await expect(pros).toHaveCount(2);

  // the new line has the caret, so listing never leaves the keyboard
  await page.keyboard.type('Ships weekly');
  await expect(pros.last().locator('.ledger__text')).toHaveValue('Ships weekly');

  // shift+Enter stays in the line it is in
  await page.keyboard.press('Shift+Enter');
  await page.keyboard.type('every Thursday');
  await expect(pros).toHaveCount(2);
  await expect(pros.last().locator('.ledger__text')).toHaveValue('Ships weekly\nevery Thursday');

  // and an empty line adds nothing — there is one waiting already
  await page.getByRole('button', { name: '+ Add a pro' }).click();
  await page.keyboard.press('Enter');
  await expect(pros).toHaveCount(3);
});

test('a line can be answered, and the answer takes weight off it', async ({ page }) => {
  await fresh(page);
  await addBranch(page, QUESTION, 'Take the offer');

  await nodeCard(page, 'Take the offer').click();
  await page.getByRole('button', { name: "What's for it, what's against" }).click();
  const sheet = page.getByRole('dialog', { name: 'Weigh this branch' });

  await page.getByRole('button', { name: '+ Add a pro' }).click();
  const line = sheet.locator('.ledger__side--pro .ledger__item').last();
  await line.locator('.ledger__text').fill('Better pay');
  await line.getByRole('radio', { name: '4', exact: true }).click();
  await expect(sheet.locator('.ledger__figures strong')).toHaveText('net +4');

  // the con that comes straight back at that pro is written under it, not in the other column
  await line.getByRole('button', { name: 'But…' }).click();
  const counter = line.locator('.counter');
  await counter.locator('.counter__text').fill('Cost of living is higher there');
  await counter.getByRole('radio', { name: '3', exact: true }).click();

  // it comes off that pro rather than becoming a con of its own: 4 − 3 = 1
  await expect(sheet.locator('.ledger__figures strong')).toHaveText('net +1');
  await expect(sheet.locator('.ledger__side--con .ledger__item')).toHaveCount(0);
  // the rating says so on its own: one step still standing, three struck through
  await expect(line.locator('.ledger__meta').first().locator('.ledger__pip.is-on')).toHaveCount(1);
  await expect(line.locator('.ledger__meta').first().locator('.ledger__pip.is-cut')).toHaveCount(3);

  // and it travels to the comparison under the line it answers
  await page.keyboard.press('Escape');
  await addBranch(page, QUESTION, 'Stay and renegotiate');
  await nodeCard(page, QUESTION).first().click();
  await page.getByRole('button', { name: 'Compare branches' }).click();
  const compare = page.getByRole('dialog', { name: 'Compare branches' });
  await expect(compare.locator('.compare-side__counter')).toContainText('Cost of living is higher there');
  await expect(compare.locator('.compare-side__counter .compare-side__weight')).toHaveText('−3');
});

test('a v1 grid becomes each branch its own pros and cons', async ({ page }) => {
  await fresh(page);

  // a save from the criteria-grid version: one criterion, two options, three scored cells
  await page.evaluate(() => {
    const doc = {
      id: 'doc1',
      version: 1,
      question: 'Should I leave the job?',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      nodes: [
        { id: 'root', type: 'thought', position: { x: 0, y: 0 }, data: { label: 'Should I leave the job?', kind: 'decision', note: '', gridId: 'g1' } },
        { id: 'a', type: 'thought', position: { x: 300, y: -80 }, data: { label: 'Take the offer', kind: 'option', note: 'written' } },
        { id: 'b', type: 'thought', position: { x: 300, y: 80 }, data: { label: 'Stay', kind: 'option', note: 'written' } },
      ],
      edges: [
        { id: 'e1', source: 'root', target: 'a', type: 'thought' },
        { id: 'e2', source: 'root', target: 'b', type: 'thought' },
      ],
      grids: {
        g1: {
          id: 'g1',
          nodeId: 'root',
          title: 'Compare the options',
          criteria: [
            { id: 'c1', label: 'What it gives me', weight: 8 },
            { id: 'c2', label: 'What it costs me', weight: 4 },
          ],
          options: [
            { id: 'o1', label: 'Take the offer', nodeId: 'a' },
            { id: 'o2', label: 'Stay', nodeId: 'b' },
          ],
          cells: {
            'o1:c1': { score: 3, note: 'the team ships' },
            'o1:c2': { score: -2, note: '' },
            'o2:c1': { score: 1, note: '' },
          },
          mode: 'weighted',
        },
      },
    };
    window.localStorage.setItem(
      'decision-maker:v1',
      JSON.stringify({ state: { doc, theme: 'system' }, version: 1 }),
    );
  });
  await page.reload();

  // a strong pro carried its note across, and the score picked the side and the weight
  await nodeCard(page, 'Take the offer').click();
  await page.getByRole('button', { name: "What's for it, what's against" }).click();
  const sheet = page.getByRole('dialog', { name: 'Weigh this branch' });
  await expect(sheet.locator('.ledger__side--pro .ledger__text')).toHaveValue(
    'What it gives me — the team ships',
  );
  await expect(sheet.locator('.ledger__side--con .ledger__text')).toHaveValue('What it costs me');
  await expect(sheet.locator('.ledger__figures strong')).toHaveText('net +2'); // 5 for, 3 against
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

test('a connection can be dragged onto a different card', async ({ page }) => {
  await fresh(page);
  await addBranch(page, QUESTION, 'Take the offer');
  await addBranch(page, QUESTION, 'Stay and renegotiate');
  await addBranch(page, 'Take the offer', 'Burn out again');
  await page.waitForTimeout(700); // the view settles before ends are where they look

  const handle = async (label: string, kind: 'source' | 'target') =>
    (await page
      .locator('.react-flow__node', { hasText: label })
      .first()
      .locator(`.react-flow__handle.${kind}`)
      .boundingBox())!;

  const from = await handle('Take the offer', 'source');
  const onto = await handle('Stay and renegotiate', 'source');

  // grab the connection's feeding end just clear of the card's own handle — the handle
  // owns the middle of that spot, and its hit test comes first
  await page.mouse.move(from.x + from.width / 2 + 16, from.y + from.height / 2);
  await page.mouse.down();
  await page.mouse.move(onto.x + onto.width / 2, onto.y + onto.height / 2, { steps: 16 });
  await page.mouse.up();

  const parents = async () =>
    page.evaluate(() => {
      const doc = JSON.parse(window.localStorage.getItem('decision-maker:v1')!).state.doc;
      const label = (id: string) =>
        doc.nodes.find((n: { id: string }) => n.id === id)?.data.label as string;
      return doc.edges.map((e: { source: string; target: string }) => [label(e.source), label(e.target)]);
    });

  // still three connections, and the outcome now hangs off the other branch
  expect(await parents()).toContainEqual(['Stay and renegotiate', 'Burn out again']);
  expect(await parents()).not.toContainEqual(['Take the offer', 'Burn out again']);
  await expect(page.locator('.react-flow__edge')).toHaveCount(3);
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
