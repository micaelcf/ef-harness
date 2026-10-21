import assert from 'node:assert/strict';
import { execFileSync, spawnSync } from 'node:child_process';
import { rmSync } from 'node:fs';
import { join } from 'node:path';
import { after, describe, test } from 'node:test';
import { fileURLToPath } from 'node:url';

import { check } from '../skills/ef-readiness/scripts/ef-check.mjs';
import { CHECKER, lines, makeRepo, pkg, removeRepo, rulebook } from './helpers.mjs';

const made = [];
after(() => made.forEach(removeRepo));

function run(files, options = {}) {
	const root = makeRepo({ 'package.json': pkg({ check: 'echo ok' }), ...files });
	made.push(root);
	return { root, ...check({ root, ...options }) };
}

const errors = (r, gate) => r.findings.filter((f) => f.level === 'error' && (gate === undefined || f.gate === gate));
const warns = (r, gate) => r.findings.filter((f) => f.level === 'warn' && (gate === undefined || f.gate === gate));

describe('a well-formed repository', () => {
	test('passes every gate with no findings', () => {
		const r = run({
			'AGENTS.md': rulebook({
				extra: [
					'## Invariants',
					'',
					'1. **Money is integer cents.** _Check:_ the type rejects floats.',
					'',
					'## Read before editing',
					'',
					'| `src/db/**` | `src/db/AGENTS.md` |',
					'',
					'See `src/db/schema.ts` and run `npm run check`.'
				].join('\n')
			}),
			'CLAUDE.md': '@AGENTS.md\n',
			'src/db/AGENTS.md': '# db\n\nSchema lives in `schema.ts`.\n',
			'src/db/schema.ts': 'export {};\n'
		});
		assert.deepEqual(r.findings, []);
	});
});

describe('anchors', () => {
	test('a rooted path that does not exist is an error on the citing line', () => {
		const r = run({ 'AGENTS.md': rulebook({ extra: 'Read `src/gone.ts` first.' }), 'src/here.ts': '' });
		const found = errors(r, 'anchors');
		assert.equal(found.length, 1);
		assert.equal(found[0].file, 'AGENTS.md');
		assert.equal(found[0].line, 5);
		assert.match(found[0].message, /src\/gone\.ts/);
	});

	test('tokens that are not claims about this repository are never checked', () => {
		const r = run({
			'AGENTS.md': rulebook({
				extra: 'See `sveltejs/kit#6315`, `@scope/pkg/sub`, `#app/*`, `/admin/models`, `features/x/y.svelte` and `a/b`.'
			})
		});
		assert.deepEqual(errors(r, 'anchors'), []);
		assert.equal(r.stats.anchors.checked, 0);
	});

	test('paths inside fenced code blocks are not citations', () => {
		const r = run({ 'AGENTS.md': rulebook({ extra: '```ts\nimport x from `src/gone.ts`;\n```' }), 'src/a.ts': '' });
		assert.deepEqual(errors(r, 'anchors'), []);
	});

	test('a markdown link resolves against the citing document, not the root', () => {
		const r = run({
			'AGENTS.md': rulebook(),
			'docs/guide.md': '[schema](../src/schema.ts) and [missing](./adr/0001.md)\n',
			'docs/adr/0002.md': '',
			'src/schema.ts': ''
		});
		const found = errors(r, 'anchors');
		assert.equal(found.length, 1);
		assert.equal(found[0].file, 'docs/guide.md');
		assert.match(found[0].message, /adr\/0001\.md/);
	});

	test('a code span in a scoped document may cite relative to that document', () => {
		const r = run({
			'AGENTS.md': rulebook({ extra: 'Editing `src/db/**` → `src/db/AGENTS.md`' }),
			'src/db/AGENTS.md': 'Tables live in `schema/user.ts`; the old `schema/old.ts` is gone.\n',
			'src/db/schema/user.ts': ''
		});
		const found = errors(r, 'anchors');
		assert.equal(found.length, 1);
		assert.match(found[0].message, /schema\/old\.ts/);
	});

	test('a line suffix past the end of the file is an error; one inside it is not', () => {
		const r = run({ 'AGENTS.md': rulebook({ extra: 'See `src/a.ts:3` and `src/a.ts:9-12`.' }), 'src/a.ts': 'one\ntwo\nthree\n' });
		const found = errors(r, 'anchors');
		assert.equal(found.length, 1);
		assert.match(found[0].message, /src\/a\.ts:9-12.*3 lines/);
	});

	test('the allowlist silences a path cited as gone, and only with a reason', () => {
		const r = run({
			'AGENTS.md': rulebook({ extra: 'ADR-1 deleted `src/old.ts` and `src/older.ts`.' }),
			'src/new.ts': '',
			'.ef/anchors.allow': ['# cited as deleted', 'src/old.ts  # ADR-1 removed it', 'src/older.ts', 'src/never-cited.ts  # stale entry'].join('\n')
		});
		const found = errors(r, 'anchors');
		assert.equal(found.length, 2, JSON.stringify(found));
		assert.ok(found.some((f) => f.file === '.ef/anchors.allow' && /has no reason/.test(f.message)));
		assert.ok(found.some((f) => f.file === 'AGENTS.md' && /src\/older\.ts/.test(f.message)));
		assert.ok(warns(r, 'anchors').some((f) => /never-cited/.test(f.message)));
	});

	test('an allowlist entry ending in / covers that directory and everything cited under it', () => {
		const r = run({
			'AGENTS.md': rulebook({ extra: 'ADR-2 removed `src/legacy/`, `src/legacy/a.ts` and `src/legacy/deep/b.ts`; `src/legacyish.ts` too.' }),
			'src/new.ts': '',
			'.ef/anchors.allow': 'src/legacy/  # ADR-2 deleted the whole tree\n'
		});
		const found = errors(r, 'anchors');
		assert.equal(found.length, 1, JSON.stringify(found));
		assert.match(found[0].message, /src\/legacyish\.ts/);
	});

	test('a doc entry turns stale citations in records into warnings, but never in a rulebook', () => {
		const r = run({
			'AGENTS.md': rulebook({ extra: 'Rules cite `src/gone.ts`. Routed: `docs/adr/AGENTS.md`' }),
			'docs/adr/0001-x.md': 'At the time, `src/gone.ts:9` held it.\n',
			'docs/adr/AGENTS.md': '# adr\n\nWas `src/gone.ts`.\n',
			'docs/live.md': 'Today `src/gone.ts` holds it.\n',
			'src/here.ts': '',
			'.ef/anchors.allow': 'doc docs/adr/  # ADRs are immutable and keep the paths of their day\n'
		});
		assert.deepEqual(
			errors(r, 'anchors').map((f) => f.file),
			['AGENTS.md', 'docs/adr/AGENTS.md', 'docs/live.md']
		);
		const recorded = warns(r, 'anchors');
		assert.deepEqual(recorded.map((f) => f.file), ['docs/adr/0001-x.md']);
		assert.match(recorded[0].message, /a record; warning only/);
	});

	test('a doc entry needs a reason', () => {
		const r = run({ 'AGENTS.md': rulebook(), 'docs/adr/a.md': '', '.ef/anchors.allow': 'doc docs/adr/\n' });
		assert.ok(errors(r, 'anchors').some((f) => f.file === '.ef/anchors.allow' && /no reason/.test(f.message)));
	});
});

describe('commands', () => {
	test('a script the package does not define is an error; one it defines is not', () => {
		const r = run({ 'AGENTS.md': rulebook({ extra: 'Run `npm run check` then `bun run test:int`.' }) });
		const found = errors(r, 'commands');
		assert.equal(found.length, 1);
		assert.match(found[0].message, /bun run test:int.*script "test:int"/);
	});

	test('make targets resolve against the Makefile', () => {
		const r = run({
			'AGENTS.md': rulebook({ extra: '`make lint` and `make deploy`' }),
			Makefile: '.PHONY: lint\nlint:\n\techo lint\nVAR := 1\n'
		});
		const found = errors(r, 'commands');
		assert.equal(found.length, 1);
		assert.match(found[0].message, /make target "deploy"/);
	});

	test('a scoped rulebook resolves against the nearest package above it', () => {
		const r = run({
			'AGENTS.md': rulebook({ extra: 'Editing `apps/web/**` → `apps/web/AGENTS.md`' }),
			'apps/web/AGENTS.md': 'Run `npm run dev` here, and `npm run check` from the root.\n',
			'apps/web/package.json': pkg({ dev: 'vite' })
		});
		assert.deepEqual(errors(r, 'commands'), []);
	});

	test('workspace-filtered commands are counted but never failed', () => {
		const r = run({ 'AGENTS.md': rulebook({ extra: '`pnpm run --filter web build`' }) });
		assert.deepEqual(errors(r, 'commands'), []);
		assert.equal(r.stats.commands.unverifiable, 1);
	});

	test('commands in shell fences are checked, other fences are not', () => {
		const r = run({ 'AGENTS.md': rulebook({ extra: '```bash\nnpm run missing-a\n```\n\n```text\nnpm run missing-b\n```' }) });
		const found = errors(r, 'commands');
		assert.equal(found.length, 1);
		assert.match(found[0].message, /missing-a/);
	});
});

describe('budget', () => {
	// `extra` replaces one line of the skeleton; the trailing newline is not a line.
	const sized = (total) => {
		const base = rulebook().split('\n').length;
		return rulebook({ extra: lines(total - base + 2) });
	};

	for (const [total, expected] of [
		[150, 'none'],
		[151, 'warn'],
		[200, 'warn'],
		[201, 'error']
	]) {
		test(`a ${total}-line root is ${expected === 'none' ? 'within budget' : `a ${expected}`}`, () => {
			const r = run({ 'AGENTS.md': sized(total) });
			assert.equal(r.stats.budget.scopes.find((s) => s.root).lines, total);
			assert.equal(errors(r, 'budget').length, expected === 'error' ? 1 : 0);
			assert.equal(warns(r, 'budget').length, expected === 'warn' ? 1 : 0);
		});
	}

	test('imported files count toward the root, including through the pointer', () => {
		const r = run({ 'CLAUDE.md': '@AGENTS.md\n', 'AGENTS.md': rulebook({ extra: '@docs/more.md' }), 'docs/more.md': lines(195) });
		const root = r.stats.budget.scopes.find((s) => s.root);
		assert.ok(root.lines > 200, `measured ${root.lines}`);
		assert.equal(errors(r, 'budget').length, 1);
	});

	test('a reasoned override in the bindings block moves the limits', () => {
		const r = run({ 'AGENTS.md': sized(230).replace('gates: npm run check', 'gates: npm run check\nrulebook-budget: root 220/260 — four runtimes until the split') });
		assert.deepEqual(errors(r), []);
		assert.equal(warns(r, 'budget').length, 1);
	});

	test('an override without a reason is an error and the defaults still apply', () => {
		const r = run({ 'AGENTS.md': sized(230).replace('gates: npm run check', 'gates: npm run check\nrulebook-budget: root 220/260') });
		assert.equal(errors(r, 'bindings').length, 1);
		assert.equal(errors(r, 'budget').length, 1);
	});

	test('a scoped rulebook over 200 lines is an error', () => {
		const r = run({ 'AGENTS.md': rulebook({ extra: '`src/AGENTS.md`' }), 'src/AGENTS.md': lines(201) });
		const found = errors(r, 'budget');
		assert.equal(found.length, 1);
		assert.equal(found[0].file, 'src/AGENTS.md');
	});
});

describe('routing', () => {
	test('a scoped rulebook the root never names is an error on the scoped file', () => {
		const r = run({ 'AGENTS.md': rulebook(), 'src/db/AGENTS.md': '# db\n' });
		const found = errors(r, 'routing');
		assert.equal(found.length, 1);
		assert.equal(found[0].file, 'src/db/AGENTS.md');
	});
});

describe('checks', () => {
	const invariants = (...items) => rulebook({ extra: ['## Invariants', '', 'Each states how it is caught.', '', ...items].join('\n') });

	test('an invariant with no Check: is an error; emphasis around Check: still counts', () => {
		const r = run({ 'AGENTS.md': invariants('1. **Ids are database-assigned.**', '2. **Money is cents.** **Check:** the brand type.', '3. **No floats.** _Check:_ lint.') });
		const found = errors(r, 'checks');
		assert.equal(found.length, 1);
		assert.match(found[0].message, /Ids are database-assigned/);
		assert.equal(r.stats.checks.checked, 2);
	});

	test('Check: none needs a reason; with one it is an honest gap', () => {
		const r = run({ 'AGENTS.md': invariants('- **Guard every page.** _Check:_ none', '- **Tokens only.** _Check:_ none — nothing lints colours; review catches a stray hex.') });
		const found = errors(r, 'checks');
		assert.equal(found.length, 1);
		assert.match(found[0].message, /Guard every page/);
		assert.equal(r.stats.checks.gaps.length, 1);
	});

	test('a lazy continuation line stays inside its item', () => {
		const r = run({ 'AGENTS.md': invariants('1. **Guard the page** with `requireSurface(locals,', 'surface)` in each page. _Check:_ guard.test.ts.') });
		assert.deepEqual(errors(r, 'checks'), []);
		assert.equal(r.stats.checks.invariants, 1);
	});

	test('a paragraph after the list is not an invariant', () => {
		const r = run({ 'AGENTS.md': invariants('1. **Rule.** _Check:_ lint.', '', 'This paragraph closes the section and needs no check.') });
		assert.equal(r.stats.checks.invariants, 1);
		assert.deepEqual(errors(r, 'checks'), []);
	});
});

describe('single-source', () => {
	test('a CLAUDE.md beside AGENTS.md that does not import it is an error', () => {
		const r = run({ 'AGENTS.md': rulebook(), 'CLAUDE.md': '# CLAUDE.md\n\nThe rulebook is AGENTS.md. Read it first.\n' });
		const found = errors(r, 'single-source');
		assert.equal(found.length, 1);
		assert.match(found[0].message, /@AGENTS\.md/);
	});

	test('an import written inside a code span does not count', () => {
		const r = run({ 'AGENTS.md': rulebook(), 'CLAUDE.md': 'Use `@AGENTS.md`.\n' });
		assert.equal(errors(r, 'single-source').length, 1);
	});

	test('a pointer holding its own invariants is an error even when it imports', () => {
		const r = run({ 'AGENTS.md': rulebook(), 'CLAUDE.md': '@AGENTS.md\n\n## Invariants\n\n1. **Extra.** _Check:_ none — duplicated here on purpose.\n' });
		assert.ok(errors(r, 'single-source').some((f) => /rules of its own/.test(f.message)));
	});
});

describe('bindings', () => {
	test('a missing block is an error', () => {
		const r = run({ 'AGENTS.md': '# Demo\n' });
		assert.equal(errors(r, 'bindings').length, 1);
	});

	test('an unknown key and an unresolvable gate are errors', () => {
		const r = run({ 'AGENTS.md': rulebook({ gates: 'npm run check, npm run nope' }).replace('gates:', 'gate: x\ngates:') });
		const found = errors(r, 'bindings');
		assert.ok(found.some((f) => /unknown key "gate:"/.test(f.message)));
		assert.ok(found.some((f) => /script "nope"/.test(f.message)));
	});

	test('a vendored checker that no gate runs is a warning', () => {
		const r = run({ 'AGENTS.md': rulebook(), '.ef/bin/ef-check.mjs': '' });
		assert.equal(warns(r, 'bindings').length, 1);
		const ok = run({ 'AGENTS.md': rulebook({ gates: 'npm run check, node .ef/bin/ef-check.mjs' }), '.ef/bin/ef-check.mjs': '' });
		assert.deepEqual(warns(ok, 'bindings'), []);
	});
});

describe('scope and git', () => {
	test('--only keeps findings reported on the named files', () => {
		const r = run({ 'AGENTS.md': rulebook({ extra: '`src/gone.ts`' }), 'docs/x.md': '`src/also-gone.ts`\n', 'src/a.ts': '' }, { only: ['docs/x.md'] });
		assert.deepEqual(
			r.findings.map((f) => f.file),
			['docs/x.md']
		);
	});

	test('ignored files are not consulted and deleted tracked files count as gone', (t) => {
		const git = spawnSync('git', ['--version']);
		if (git.status !== 0) return t.skip('git not available');
		const root = makeRepo({
			'package.json': pkg({ check: 'x' }),
			'AGENTS.md': rulebook({ extra: '`build/out.js` and `src/deleted.ts`' }),
			'.gitignore': 'build/\n',
			'build/out.js': '',
			'src/deleted.ts': '',
			'src/kept.ts': ''
		});
		made.push(root);
		const opts = { cwd: root, stdio: 'ignore' };
		execFileSync('git', ['init', '-q'], opts);
		execFileSync('git', ['add', '-A'], opts);
		execFileSync('git', ['-c', 'user.email=t@t', '-c', 'user.name=t', 'commit', '-qm', 'init'], opts);
		rmSync(join(root, 'src/deleted.ts'));
		const r = check({ root });
		assert.equal(r.viaGit, true);
		const found = errors(r, 'anchors');
		assert.equal(found.length, 1, JSON.stringify(found));
		assert.match(found[0].message, /src\/deleted\.ts/);
	});
});

describe('cli', () => {
	const cli = (root, ...args) => spawnSync(process.execPath, [fileURLToPath(CHECKER), '--root', root, ...args], { encoding: 'utf8' });

	test('exits 0 on a clean repository and 1 when any gate errors', () => {
		const clean = makeRepo({ 'package.json': pkg({ check: 'x' }), 'AGENTS.md': rulebook() });
		const broken = makeRepo({ 'package.json': pkg({ check: 'x' }), 'AGENTS.md': rulebook({ extra: '`src/gone.ts`' }), 'src/a.ts': '' });
		made.push(clean, broken);
		const ok = cli(clean);
		assert.equal(ok.status, 0, ok.stdout + ok.stderr);
		assert.match(ok.stdout, /PASS/);
		const bad = cli(broken, '--json');
		assert.equal(bad.status, 1);
		assert.equal(JSON.parse(bad.stdout).findings[0].gate, 'anchors');
	});

	test('exits 2 on an unknown argument', () => {
		assert.equal(cli('.', '--nope').status, 2);
	});
});
