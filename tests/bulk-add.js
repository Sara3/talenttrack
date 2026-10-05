// Bulk add regression checks (Nadia's report plus the cases independent testers found).
// Run: NODE_PATH=$(npm root -g) node tests/bulk-add.js   — every line should say PASS.
const { chromium } = require('playwright');
const URL = 'file://' + require('path').resolve(__dirname, '../index.html');
// [label, how, input, expected [name, role?] list]
const T = (n, r) => [n, r];
const CASES = [
  ['Nadia: three names, newlines (fill)', 'fill', 'Quinn Albright\nRosa Delgado\nTomas Berg', [T('Quinn Albright'), T('Rosa Delgado'), T('Tomas Berg')]],
  ['three names, CRLF', 'fill', 'Quinn Albright\r\nRosa Delgado\r\nTomas Berg', [T('Quinn Albright'), T('Rosa Delgado'), T('Tomas Berg')]],
  ['three names, bare CR', 'fill', 'Quinn Albright\rRosa Delgado\rTomas Berg', [T('Quinn Albright'), T('Rosa Delgado'), T('Tomas Berg')]],
  ['three names, typed with Enter', 'type', 'Quinn Albright\nRosa Delgado\nTomas Berg', [T('Quinn Albright'), T('Rosa Delgado'), T('Tomas Berg')]],
  ['three names, real Ctrl+V paste', 'paste', 'Quinn Albright\nRosa Delgado\nTomas Berg', [T('Quinn Albright'), T('Rosa Delgado'), T('Tomas Berg')]],
  ['commas', 'fill', 'Quinn Albright, Rosa Delgado, Tomas Berg', [T('Quinn Albright'), T('Rosa Delgado'), T('Tomas Berg')]],
  ['semicolons', 'fill', 'Quinn Albright; Rosa Delgado; Tomas Berg', [T('Quinn Albright'), T('Rosa Delgado'), T('Tomas Berg')]],
  ['tabs across one row', 'fill', 'Quinn Albright\tRosa Delgado\tTomas Berg', [T('Quinn Albright'), T('Rosa Delgado'), T('Tomas Berg')]],
  ['wide gaps', 'fill', 'Quinn Albright  Rosa Delgado  Tomas Berg', [T('Quinn Albright'), T('Rosa Delgado'), T('Tomas Berg')]],
  ['first names only', 'fill', 'Quinn, Rosa, Tomas', [T('Quinn'), T('Rosa'), T('Tomas')]],
  ['Lopez, Maria is one person', 'fill', 'Lopez, Maria', [T('Lopez, Maria')]],
  ['Lopez, Maria Elena is one person', 'fill', 'Lopez, Maria Elena\nOkafor, Grace Ann', [T('Lopez, Maria Elena'), T('Okafor, Grace Ann')]],
  ['Lopez, Maria in the bulk panel', 'bulk', 'Lopez, Maria', [T('Lopez, Maria')]],
  ['Jr. suffix', 'fill', 'Martin Luther King, Jr.\nRosa Delgado', [T('Martin Luther King, Jr.'), T('Rosa Delgado')]],
  ['surname Porter is not a role', 'fill', 'Ana Diaz, Mia Porter', [T('Ana Diaz'), T('Mia Porter')]],
  ['surname Cook across a row', 'fill', 'Ana Diaz\tBen Cook\tCara Lee', [T('Ana Diaz'), T('Ben Cook'), T('Cara Lee')]],
  ['Hostetler and Sargent', 'fill', 'Quinn Albright\tAshley Hostetler\tRachel Sargent', [T('Quinn Albright'), T('Ashley Hostetler'), T('Rachel Sargent')]],
  ['Name, Role', 'fill', 'Ana Diaz, Warehouse Planner', [T('Ana Diaz', 'Warehouse Planner')]],
  ['Name<TAB>Role', 'fill', 'Ana Diaz\tWarehouse Planner', [T('Ana Diaz', 'Warehouse Planner')]],
  ['Name, Line Cook lines', 'fill', 'Rosa Delgado, Line Cook\nTomas Berg, Truck Driver', [T('Rosa Delgado', 'Line Cook'), T('Tomas Berg', 'Truck Driver')]],
  ['Word numbered list (number + tab)', 'paste', '1.\tQuinn Albright\r\n2.\tRosa Delgado\r\n3.\tTomas Berg', [T('Quinn Albright'), T('Rosa Delgado'), T('Tomas Berg')]],
  ['Word bullets (bullet + tab)', 'fill', '•\tQuinn Albright\n·\tRosa Delgado\n◦ Tomas Berg', [T('Quinn Albright'), T('Rosa Delgado'), T('Tomas Berg')]],
  ['numbers without a space', 'fill', '1.Quinn Albright\n2.Rosa Delgado', [T('Quinn Albright'), T('Rosa Delgado')]],
  ['en-dash bullets', 'fill', '– Quinn Albright\n– Rosa Delgado', [T('Quinn Albright'), T('Rosa Delgado')]],
  ['zero-width characters', 'fill', '​Quinn Albright​\n​\nRosa Delgado​', [T('Quinn Albright'), T('Rosa Delgado')]],
  ['spreadsheet header row', 'fill', 'Candidate Name\tPosition\nQuinn Albright\tBarista\nRosa Delgado\tCashier', [T('Quinn Albright', 'Barista'), T('Rosa Delgado', 'Cashier')]],
  ['Names header', 'fill', 'Names\nQuinn Albright\nRosa Delgado', [T('Quinn Albright'), T('Rosa Delgado')]],
  ['email addresses removed', 'fill', 'Quinn Albright <quinn@example.com>\nRosa Delgado <rosa@example.com>', [T('Quinn Albright'), T('Rosa Delgado')]],
  ['slash, and, ampersand', 'fill', 'Quinn Albright / Rosa Delgado', [T('Quinn Albright'), T('Rosa Delgado')]],
  ['Slack mentions and emoji', 'fill', '@Quinn Albright 🎉\n@Rosa Delgado 👋', [T('Quinn Albright'), T('Rosa Delgado')]],
  ['Japanese comma', 'fill', '山田太郎、佐藤花子、鈴木一郎', [T('山田太郎'), T('佐藤花子'), T('鈴木一郎')]],
  ['J. initial kept', 'fill', 'J. Quinn Albright\nRosa Delgado', [T('J. Quinn Albright'), T('Rosa Delgado')]],
  ['single name', 'fill', 'Quinn Albright', [T('Quinn Albright')]],
  ['single Name, Line Cook', 'fill', 'Rosa Delgado, Line Cook', [T('Rosa Delgado', 'Line Cook')]],
  ['single Name<TAB>Kitchen Lead', 'fill', 'Rosa Delgado\tKitchen Lead', [T('Rosa Delgado', 'Kitchen Lead')]],
  ['single Name<TAB>Support Agent', 'fill', 'Rosa Delgado\tSupport Agent', [T('Rosa Delgado', 'Support Agent')]],
  ['50 names via bulk panel', 'bulk', Array.from({length: 50}, (_, i) => 'Person Number' + i).join('\n'), Array.from({length: 50}, (_, i) => T('Person Number' + i))],
];
(async () => {
  const b = await chromium.launch();
  let fails = 0;
  for (const [label, how, input, want] of CASES) {
    const ctx = await b.newContext({ permissions: ['clipboard-read', 'clipboard-write'] });
    const pg = await ctx.newPage(); const errs = []; pg.on('pageerror', e => errs.push(String(e)));
    await pg.goto(URL);
    const ids0 = await pg.$$eval('.card', cs => cs.map(c => c.dataset.id));
    if (how === 'fill') { await pg.fill('#f-name', input); await pg.click('#add-btn'); }
    if (how === 'type') { await pg.click('#f-name'); await pg.type('#f-name', input); await pg.click('#add-btn'); }
    if (how === 'paste') { await pg.evaluate(t => navigator.clipboard.writeText(t), input); await pg.focus('#f-name'); await pg.keyboard.press('Control+V'); await pg.click('#add-btn'); }
    if (how === 'bulk') { await pg.click('#bulk-toggle'); await pg.fill('#b-list', input); await pg.click('#b-add'); }
    await pg.waitForTimeout(100);
    const added = await pg.$$eval('.lane[data-stage="applied"] .card', (cs, ids0) => cs.filter(c => !ids0.includes(c.dataset.id)).map(c => [c.querySelector('.c-name').textContent, c.querySelector('.c-role').textContent]), ids0);
    const field = await pg.inputValue('#f-name');
    const got = added.map(x => x[0]).sort(); const exp = want.map(x => x[0]).sort();
    let ok = JSON.stringify(got) === JSON.stringify(exp) && field === '' && !errs.length;
    for (const [n, r] of want) if (r && !added.some(x => x[0] === n && x[1] === r)) ok = false;
    if (!ok) fails++;
    console.log(ok ? 'PASS' : 'FAIL', label.padEnd(38), '| added', added.length, JSON.stringify(added), field ? '| field left: ' + JSON.stringify(field) : '', errs.join(' '));
    await ctx.close();
  }
  console.log(fails ? fails + ' FAILED' : 'ALL PASS');
  await b.close();
})();
