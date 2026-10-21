import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { after, describe, test } from 'node:test';
import { fileURLToPath } from 'node:url';

import ompExtension from '../hooks/omp-post-edit.js';
import { CHECKER, makeRepo, pkg, removeRepo, rulebook } from './helpers.mjs';

const CLAUDE_HOOK = fileURLToPath(new URL('../hooks/claude-post-edit.mjs', import.meta.url));
const vendored = readFileSync(CHECKER, 'utf8');
const made = [];
after(() => made.forEach(removeRepo));

function repo(files, { optIn = true } = {}) {
	const root = makeRepo({
		'package.json': pkg({ check: 'x' }),
		'AGENTS.md': rulebook({ gates: 'npm run check, node .ef/bin/ef-check.mjs' }),
		...(optIn ? { '.ef/bin/ef-check.mjs': vendored } : {}),
		...files
	});
	made.push(root);
	return root;
}

function claude(root, filePath) {
	const input = JSON.stringify({ hook_event_name: 'PostToolUse', tool_name: 'Edit', cwd: root, tool_input: { file_path: filePath } });
	const run = spawnSync(process.execPath, [CLAUDE_HOOK], { input, encoding: 'utf8', env: { ...process.env, CLAUDE_PROJECT_DIR: root } });
	assert.equal(run.status, 0, run.stderr);
	return run.stdout.trim() === '' ? null : JSON.parse(run.stdout);
}

describe('Claude Code hook', () => {
	test('blocks with the finding when the edited markdown breaks a gate', () => {
		const root = repo({ 'docs/guide.md': 'See `src/gone.ts`.\n', 'src/a.ts': '' });
		const out = claude(root, join(root, 'docs', 'guide.md'));
		assert.equal(out.decision, 'block');
		assert.match(out.reason, /docs\/guide\.md:1 \[anchors\].*src\/gone\.ts/);
	});

	test('says nothing about findings in files the edit did not touch', () => {
		const root = repo({ 'docs/broken.md': 'See `src/gone.ts`.\n', 'docs/fine.md': 'Fine.\n', 'src/a.ts': '' });
		assert.equal(claude(root, join(root, 'docs', 'fine.md')), null);
	});

	test('passes warnings as added context, not as a block', () => {
		const root = repo({ 'AGENTS.md': rulebook({ gates: 'npm run check, node .ef/bin/ef-check.mjs', extra: Array(160).fill('x').join('\n') }) });
		const out = claude(root, join(root, 'AGENTS.md'));
		assert.equal(out.decision, undefined);
		assert.match(out.hookSpecificOutput.additionalContext, /warn AGENTS\.md:1 \[budget\]/);
	});

	test('does nothing in a repository that has not vendored the checker', () => {
		const root = repo({ 'docs/guide.md': 'See `src/gone.ts`.\n', 'src/a.ts': '' }, { optIn: false });
		assert.equal(claude(root, join(root, 'docs', 'guide.md')), null);
	});

	test('ignores edits to files that are not markdown', () => {
		const root = repo({ 'docs/guide.md': 'See `src/gone.ts`.\n', 'src/a.ts': '' });
		assert.equal(claude(root, join(root, 'src', 'a.ts')), null);
	});

	test('blocks a slice file whose Reads: names a contract file that does not exist', () => {
		const root = repo({
			'.ef/demo/checks.md': '# Demo\n\n## Requirements\n\n- `RF-001`\n\n| S0 | [slices/S0-a.md](slices/S0-a.md) |\n',
			'.ef/demo/contract/bindings.md': '# Bindings\n',
			'.ef/demo/slices/S0-a.md': '# S0\n\nOwns: `src/a.ts`\nReads: contract/bindings.md, contract/gone.md\n\n**C1** · RF-001 — works\nProof: `npm run check`\n',
			'src/a.ts': ''
		});
		const out = claude(root, join(root, '.ef', 'demo', 'slices', 'S0-a.md'));
		assert.equal(out.decision, 'block');
		assert.match(out.reason, /\[feature\] reads contract\/gone\.md, which does not exist/);
	});
});

describe('omp extension', () => {
	function handler() {
		const handlers = {};
		ompExtension({ on: (event, fn) => (handlers[event] = fn) });
		return handlers.tool_result;
	}

	test('returns the finding as additional context after an edit', async () => {
		const root = repo({ 'docs/guide.md': 'See `src/gone.ts`.\n', 'src/a.ts': '' });
		const out = await handler()({ toolName: 'edit', isError: false, input: { path: 'docs/guide.md' } }, { cwd: root });
		assert.match(out.additionalContext, /docs\/guide\.md:1 \[anchors\]/);
	});

	test('ignores failed calls and other tools', async () => {
		const root = repo({ 'docs/guide.md': 'See `src/gone.ts`.\n', 'src/a.ts': '' });
		const run = handler();
		assert.equal(await run({ toolName: 'edit', isError: true, input: { path: 'docs/guide.md' } }, { cwd: root }), undefined);
		assert.equal(await run({ toolName: 'read', isError: false, input: { path: 'docs/guide.md' } }, { cwd: root }), undefined);
	});

	test('reads the edited path from file_path and paths as well as path', async () => {
		const root = repo({ 'docs/a.md': 'See `src/gone.ts`.\n', 'docs/b.md': 'See `src/lost.ts`.\n', 'src/a.ts': '' });
		const run = handler();
		const one = await run({ toolName: 'write', isError: false, input: { file_path: join(root, 'docs', 'a.md') } }, { cwd: root });
		assert.match(one.additionalContext, /docs\/a\.md:1 \[anchors\]/);
		const many = await run({ toolName: 'edit', isError: false, input: { paths: ['docs/b.md'] } }, { cwd: root });
		assert.match(many.additionalContext, /docs\/b\.md:1 \[anchors\].*src\/lost\.ts/);
	});

	test('reports a checker that cannot run instead of staying silent', async () => {
		const root = repo({ 'docs/a.md': 'Text.\n' });
		writeFileSync(join(root, '.ef', 'bin', 'ef-check.mjs'), "throw new Error('boom');\n");
		const out = await handler()({ toolName: 'edit', isError: false, input: { path: 'docs/a.md' } }, { cwd: root });
		assert.match(out.additionalContext, /ef rulebook hook failed: .*exited 1 without a report.*boom/);
	});
});

describe('Claude Code hook when the checker breaks', () => {
	test('passes the failure to the agent as context and exits 0', () => {
		const root = repo({ 'docs/a.md': 'Text.\n' });
		writeFileSync(join(root, '.ef', 'bin', 'ef-check.mjs'), "throw new Error('boom');\n");
		const out = claude(root, join(root, 'docs', 'a.md'));
		assert.match(out.hookSpecificOutput.additionalContext, /ef rulebook hook failed: .*boom/);
	});
});
