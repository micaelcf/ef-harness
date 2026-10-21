import assert from 'node:assert/strict';
import { execFileSync, spawnSync } from 'node:child_process';
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { after, describe, test } from 'node:test';
import { fileURLToPath } from 'node:url';

import { check, droppedLines, splitChecklist } from '../skills/ef-readiness/scripts/ef-check.mjs';
import { CHECKER, lines, makeRepo, pkg, removeRepo, rulebook } from './helpers.mjs';

const made = [];
after(() => made.forEach(removeRepo));

const F = '.ef/demo';

function repo(files) {
	const root = makeRepo({ 'package.json': pkg({ check: 'x' }), 'AGENTS.md': rulebook(), ...files });
	made.push(root);
	return root;
}

function feature(files) {
	const root = repo(files);
	const r = check({ root });
	return { root, r, errors: r.findings.filter((f) => f.gate === 'feature' && f.level === 'error'), warns: r.findings.filter((f) => f.gate === 'feature' && f.level === 'warn') };
}

const checkLine = (id, claim = 'claim', proof = true) => [`**C${id}** — ${claim}`, ...(proof ? [`Proof: \`npm run check -- c${id}\``] : [])].join('\n');

const single = (body, requirements = '## Requirements\n\n- `RF-001` — export\n') =>
	['# Demo — repo', '', requirements, '## Checks', '', '### S0 — export', '', body, '', '## Coverage', '', '| Set | Proof |', '| --- | --- |', '| export | C1 |', ''].join('\n');

describe('feature gate: any layout', () => {
	test('a duplicated check id and a check without a proof are errors', () => {
		const { errors } = feature({ [`${F}/checks.md`]: single([checkLine(1, 'RF-001 exports'), checkLine(1, 'again'), checkLine(2, 'no proof', false)].join('\n')) });
		assert.ok(errors.some((f) => /C1 is already defined/.test(f.message)));
		assert.ok(errors.some((f) => /C2 has no "Proof:"/.test(f.message)));
	});

	test('a cited check id that nothing defines is an error, except in history sections', () => {
		const text = single(checkLine(1, 'RF-001 exports')).replace('| export | C1 |', '| export | C1, C7 |') + '\n## Landed\n\nC99 was dropped.\n';
		const { errors } = feature({ [`${F}/checks.md`]: text });
		assert.deepEqual(
			errors.map((f) => f.message),
			['cites C7, which no check defines.']
		);
	});

	test('every owned requirement needs a citing check, and a check may cite only owned ids', () => {
		const text = single(checkLine(1, 'RF-002 exports, per ADR-0063'), '## Requirements\n\n- `RF-001` — export\n- `RF-002` — paging\n');
		const { errors } = feature({ [`${F}/checks.md`]: text.replace('RF-002 exports', 'RF-002 and RF-009 export') });
		assert.ok(errors.some((f) => /RF-001 is owned here but no check cites it/.test(f.message)));
		assert.ok(errors.some((f) => /cites RF-009/.test(f.message)));
		assert.ok(!errors.some((f) => /ADR-0063/.test(f.message)));
	});

	test('without a Requirements section coverage is a warning, not an error', () => {
		const { errors, warns } = feature({ [`${F}/checks.md`]: single(checkLine(1), '') });
		assert.deepEqual(errors, []);
		assert.ok(warns.some((f) => /no "## Requirements" section/.test(f.message)));
	});

	test('a feature under a gitignored .ef/ is still checked', (t) => {
		if (spawnSync('git', ['--version']).status !== 0) return t.skip('git not available');
		const root = repo({ '.gitignore': '.ef/\n', [`${F}/checks.md`]: single(checkLine(1, 'RF-001 x', false)) });
		const opts = { cwd: root, stdio: 'ignore' };
		execFileSync('git', ['init', '-q'], opts);
		const r = check({ root });
		assert.equal(r.viaGit, true);
		assert.ok(r.findings.some((f) => f.gate === 'feature' && /no "Proof:"/.test(f.message)));
	});
});

function splitFiles(overrides = {}) {
	return {
		[`${F}/checks.md`]: [
			'# Demo — repo',
			'',
			'## Requirements',
			'',
			'- `RF-001`, `RF-002`',
			'',
			'## Contract',
			'',
			'| File | Holds |',
			'| --- | --- |',
			'| [contract/shared.md](contract/shared.md) | bindings |',
			'| [contract/schema.md](contract/schema.md) | schema |',
			'',
			'## Slices',
			'',
			'| Slice | File | Checks |',
			'| --- | --- | --- |',
			'| S0 | [slices/S0-schema.md](slices/S0-schema.md) | C1 |',
			'| S1 | [slices/S1-ui.md](slices/S1-ui.md) | C2 |',
			''
		].join('\n'),
		[`${F}/contract/shared.md`]: '# Shared\n',
		[`${F}/contract/schema.md`]: '# Schema\n',
		[`${F}/slices/S0-schema.md`]: ['# S0 — schema', '', 'Owns: `src/db/**`', 'Reads: contract/shared.md, contract/schema.md', '', checkLine(1, 'RF-001 tables')].join('\n'),
		[`${F}/slices/S1-ui.md`]: ['# S1 — ui', '', 'Owns: `src/ui/**`', 'Reads: contract/shared.md', '', checkLine(2, 'RF-002 screen')].join('\n'),
		[`${F}/verification.md`]: '# Verification\n\n## Coverage\n\n| tables | C1 |\n| screen | C2 |\n',
		...overrides
	};
}

describe('feature gate: split layout', () => {
	test('a well-formed split feature passes', () => {
		const { errors, warns } = feature(splitFiles());
		assert.deepEqual([...errors, ...warns], []);
	});

	test('a slice the index does not list, and a listed slice that does not exist, are errors', () => {
		const files = splitFiles({ [`${F}/slices/S2-extra.md`]: ['# S2', '', 'Owns: `src/x.ts`', 'Reads: contract/shared.md', '', checkLine(3)].join('\n') });
		files[`${F}/checks.md`] += '| S9 | [slices/S9-gone.md](slices/S9-gone.md) | — |\n';
		const { errors } = feature(files);
		assert.ok(errors.some((f) => f.file === `${F}/slices/S2-extra.md` && /does not list slices\/S2-extra\.md/.test(f.message)));
		assert.ok(errors.some((f) => f.file === `${F}/checks.md` && /slices\/S9-gone\.md, which does not exist/.test(f.message)));
	});

	test('a missing Reads target and a contract file nobody reads are errors', () => {
		const { errors } = feature(
			splitFiles({ [`${F}/slices/S0-schema.md`]: ['# S0', '', 'Owns: `src/db/**`', 'Reads: contract/shared.md, contract/scheme.md', '', checkLine(1, 'RF-001 tables')].join('\n') })
		);
		assert.ok(errors.some((f) => /reads contract\/scheme\.md, which does not exist/.test(f.message)));
		assert.ok(errors.some((f) => f.file === `${F}/contract/schema.md` && /no slice reads this contract file/.test(f.message)));
	});

	test('a path owned by two slices, and a slice with no Owns or Reads line, are errors', () => {
		const { errors } = feature(
			splitFiles({
				[`${F}/slices/S1-ui.md`]: ['# S1', '', 'Owns: `src/ui/**`, `src/db/**`', 'Reads: contract/shared.md', '', checkLine(2, 'RF-002 screen')].join('\n'),
				[`${F}/slices/S2-bare.md`]: ['# S2', '', checkLine(3)].join('\n')
			})
		);
		assert.ok(errors.some((f) => /src\/db\/\*\* is also owned by/.test(f.message)));
		assert.ok(errors.some((f) => f.file === `${F}/slices/S2-bare.md` && /no "Owns:"/.test(f.message)));
		assert.ok(errors.some((f) => f.file === `${F}/slices/S2-bare.md` && /no "Reads:"/.test(f.message)));
	});

	test('a slice file over 150 lines and checks defined in the index are errors', () => {
		const files = splitFiles({ [`${F}/slices/S1-ui.md`]: ['# S1', '', 'Owns: `src/ui/**`', 'Reads: contract/shared.md', '', checkLine(2, 'RF-002 screen'), lines(150)].join('\n') });
		files[`${F}/checks.md`] += `\n${checkLine(9)}\n`;
		const { errors } = feature(files);
		assert.ok(errors.some((f) => f.file === `${F}/slices/S1-ui.md` && /lines; a slice file stays under 150/.test(f.message)));
		assert.ok(errors.some((f) => f.file === `${F}/checks.md` && /defines checks, but this feature is split/.test(f.message)));
	});

	test('a check range in the index is expanded, so a range past the last check fails', () => {
		const files = splitFiles();
		files[`${F}/checks.md`] = files[`${F}/checks.md`].replace('| C2 |', '| C2–C4 |');
		const { errors } = feature(files);
		assert.deepEqual(
			errors.map((f) => f.message),
			['cites C3, which no check defines.', 'cites C4, which no check defines.']
		);
	});
});

describe('feature gate: overlapping ownership', () => {
	test('a glob that can cover another slice\'s files is a warning; disjoint trees are not', () => {
		const { errors, warns } = feature(
			splitFiles({
				[`${F}/slices/S1-ui.md`]: ['# S1', '', 'Owns: `src/ui/**`, `src/**/*.css`, `src/db/*.svelte`', 'Reads: contract/shared.md', '', checkLine(2, 'RF-002 screen')].join('\n')
			})
		);
		assert.deepEqual(errors, []);
		assert.deepEqual(
			warns.map((f) => f.message.split(' overlaps ')[0]),
			['src/**/*.css', 'src/db/*.svelte']
		);
	});
});

describe('feature gate: deliberate splits', () => {
	test('an Except: line naming the other slice\'s path silences the overlap, in either listing order', () => {
		const base = (s0, s1) =>
			splitFiles({
				[`${F}/slices/S0-schema.md`]: ['# S0', '', ...s0, 'Reads: contract/shared.md, contract/schema.md', '', checkLine(1, 'RF-001 tables')].join('\n'),
				[`${F}/slices/S1-ui.md`]: ['# S1', '', ...s1, 'Reads: contract/shared.md', '', checkLine(2, 'RF-002 screen')].join('\n')
			});
		const wide = ['Owns: `src/orders/**`'];
		const narrow = ['Owns: `src/orders/review.svelte`'];
		assert.equal(feature(base(wide, narrow)).warns.length, 1);
		assert.equal(feature(base(narrow, wide)).warns.length, 1);
		assert.deepEqual(feature(base([...wide, 'Except: `src/orders/review.svelte`'], narrow)).warns, []);
		assert.deepEqual(feature(base(narrow, [...wide, 'Except: `src/orders/*.svelte`'])).warns, []);
	});

	test('an Except: inside a fenced example is not a directive', () => {
		const files = splitFiles({
			[`${F}/slices/S0-schema.md`]: ['# S0', '', 'Owns: `src/orders/**`', 'Reads: contract/shared.md, contract/schema.md', '', '```markdown', 'Except: `src/orders/review.svelte`', '```', '', checkLine(1, 'RF-001 tables')].join('\n'),
			[`${F}/slices/S1-ui.md`]: ['# S1', '', 'Owns: `src/orders/review.svelte`', 'Reads: contract/shared.md', '', checkLine(2, 'RF-002 screen')].join('\n')
		});
		assert.equal(feature(files).warns.length, 1);
	});
});

describe('split migration guards', () => {
	test('droppedLines reports a missing line, and counts a line written twice in the original', () => {
		const original = '# T\n\nkeep me\nrepeat\nrepeat\nlost line\n';
		const outputs = new Map([['checks.md', '# T\n\nkeep me\nrepeat\n']]);
		assert.deepEqual(
			droppedLines(original, outputs).map((m) => m.text),
			['repeat', 'lost line']
		);
	});

	test('a refused split exits 2 with the reason and no stack trace', () => {
		const root = repo({ [`${F}/checks.md`]: '# Demo\n', [`${F}/log.md`]: 'mine\n' });
		const run = spawnSync(process.execPath, [fileURLToPath(CHECKER), '--root', root, '--split', F], { encoding: 'utf8' });
		assert.equal(run.status, 2);
		assert.match(run.stderr, /^ef-check: .*log\.md already exists/);
		assert.doesNotMatch(run.stderr, /\n\s+at /);
	});
});

describe('anchors: line ranges', () => {
	test('line 0 and a range that ends before it starts are errors', () => {
		const root = repo({ 'AGENTS.md': rulebook({ extra: '`src/a.ts:0`, `src/a.ts:3-1` and `src/a.ts:2-3`' }), 'src/a.ts': 'a\nb\nc\n' });
		const found = check({ root }).findings.filter((f) => f.gate === 'anchors');
		assert.deepEqual(
			found.map((f) => f.message.split(',')[0]),
			['cites src/a.ts:0', 'cites src/a.ts:3-1']
		);
	});
});

describe('splitting a single-file checklist', () => {
	const original = [
		'# Demo — repo',
		'',
		'Sources:',
		'',
		'- PRD — requirements',
		'',
		'## Stage 3 record',
		'',
		'Anchors: 4 VERIFIED.',
		'',
		'## Contract',
		'',
		'### Bindings',
		'',
		'gates: npm run check',
		'',
		'### Schema (S0)',
		'',
		'Table `export_job`.',
		'',
		'## Ownership',
		'',
		'| Slice | Files this slice alone writes | Wave |',
		'| --- | --- | --- |',
		'| S0 schema | `src/db/**` | 0 |',
		'| S1 ui | `src/ui/**` | 1 |',
		'| lead | `docs/**` | — |',
		'',
		'`src/shared.ts` is owned by S1.',
		'',
		'## Landing',
		'',
		'- Nothing else in this change is hard to reverse',
		'',
		'## Checks',
		'',
		'### S0 — schema · 2 files',
		'',
		checkLine(1, 'table exists'),
		'',
		'### S1 — ui',
		'',
		checkLine(2, 'screen renders'),
		checkLine(3, 'screen pages'),
		'',
		'## Swept',
		'',
		'- idempotency: C1',
		'',
		'## Coverage',
		'',
		'| screen | C2, C3 |',
		'',
		'## Landed (2026-10-02)',
		'',
		'Shipped.',
		''
	].join('\n');

	test('produces the split layout, and the result passes the feature gate', () => {
		const root = repo({ [`${F}/checks.md`]: original });
		const dir = join(root, F);
		const out = splitChecklist(dir);
		assert.deepEqual(out.written.sort(), [
			'checks.md',
			'contract/bindings.md',
			'contract/schema.md',
			'log.md',
			'slices/S0-schema.md',
			'slices/S1-ui.md',
			'verification.md'
		]);
		const read = (rel) => readFileSync(join(dir, rel), 'utf8');
		assert.match(read('slices/S0-schema.md'), /^Owns: `src\/db\/\*\*`$/m);
		assert.match(read('slices/S0-schema.md'), /^Reads: contract\/bindings\.md, contract\/schema\.md$/m);
		assert.match(read('slices/S1-ui.md'), /^Reads: contract\/bindings\.md$/m);
		assert.match(read('checks.md'), /\| S1 \| ui \| 1 \| \[slices\/S1-ui\.md\]\(slices\/S1-ui\.md\) \| C2–C3 \|/);
		assert.match(read('checks.md'), /\| lead \| `docs\/\*\*` \| — \|/);
		assert.match(read('checks.md'), /`src\/shared\.ts` is owned by S1\./);
		assert.doesNotMatch(read('checks.md'), /\*\*C\d+\*\*/);
		assert.match(read('verification.md'), /## Swept[\s\S]*## Coverage/);
		assert.match(read('log.md'), /## Stage 3 record[\s\S]*## Landed/);

		const r = check({ root });
		assert.deepEqual(r.findings.filter((f) => f.gate === 'feature' && f.level === 'error'), []);
	});

	test('refuses a feature that is already split', () => {
		const root = repo({ [`${F}/checks.md`]: original });
		splitChecklist(join(root, F));
		assert.ok(existsSync(join(root, F, 'slices')));
		assert.throws(() => splitChecklist(join(root, F)), /already split/);
	});

	test('keeps every line of an irregular checklist and backs up the original', () => {
		const odd = [
			'# Odd — repo',
			'',
			'Preamble prose before any section, with a | pipe in it.',
			'',
			'## Notes from the lead',
			'',
			'An unknown section stays in the index.',
			'',
			'## Contract',
			'',
			'Text inside the contract before its first topic.',
			'',
			'### Naming',
			'',
			'- `exportJob` everywhere',
			'',
			'## Ownership',
			'',
			'| Slice | Files this slice alone writes |',
			'|-------|------------------------------|',
			'| S0 schema | `src/db/**` |',
			'',
			'Notes under the table survive.',
			'',
			'## Checks',
			'',
			'Loose text before the first slice.',
			'',
			'### Conventions shared by every slice',
			'',
			'An unknown third-level block inside Checks.',
			'',
			'### S0 — schema',
			'',
			checkLine(1, 'table exists'),
			'',
			'```ts',
			'## not a heading inside a fence',
			'```',
			''
		].join('\n');
		const root = repo({ [`${F}/checks.md`]: odd });
		const dir = join(root, F);
		const out = splitChecklist(dir);
		assert.equal(readFileSync(join(dir, 'checks.md.orig'), 'utf8'), odd);
		// Exact trimmed lines, counted: a dropped closing fence must not hide behind the opening one.
		const pool = out.written.flatMap((rel) => readFileSync(join(dir, rel), 'utf8').split('\n').map((l) => l.trim()));
		const takeLine = (line) => {
			const at = pool.indexOf(line);
			if (at === -1) return false;
			pool.splice(at, 1);
			return true;
		};
		for (const line of odd.split('\n').map((l) => l.trim()).filter(Boolean)) {
			if (/^## (Contract|Checks|Ownership)$/.test(line) || /^\|[-|]+\|$/.test(line) || line === '| Slice | Files this slice alone writes |') continue;
			const forms = [line, line.replace(/^### /, '# '), line === '| S0 schema | `src/db/**` |' ? 'Owns: `src/db/**`' : line];
			assert.ok(forms.some(takeLine), `dropped: ${line}`);
		}
	});

	test('refuses to overwrite an existing verification.md, log.md or backup', () => {
		for (const name of ['verification.md', 'log.md', 'checks.md.orig']) {
			const root = repo({ [`${F}/checks.md`]: original, [`${F}/${name}`]: 'mine\n' });
			assert.throws(() => splitChecklist(join(root, F)), /already exists/);
			assert.equal(readFileSync(join(root, F, name), 'utf8'), 'mine\n');
			assert.equal(readFileSync(join(root, F, 'checks.md'), 'utf8'), original);
		}
	});
});
