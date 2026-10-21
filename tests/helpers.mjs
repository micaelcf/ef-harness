import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';

export const CHECKER = new URL('../skills/ef-readiness/scripts/ef-check.mjs', import.meta.url);

/** Write `files` ({ 'rel/path': 'content' }) into a fresh temp directory; returns its path. */
export function makeRepo(files) {
	const root = mkdtempSync(join(tmpdir(), 'ef-check-'));
	for (const [rel, content] of Object.entries(files)) {
		const path = join(root, rel);
		mkdirSync(dirname(path), { recursive: true });
		writeFileSync(path, content);
	}
	return root;
}

export function removeRepo(root) {
	rmSync(root, { recursive: true, force: true });
}

export const lines = (n, prefix = 'line') => Array.from({ length: n }, (_, i) => `${prefix} ${i + 1}`).join('\n');

/** A root rulebook that passes every gate, with room to splice in a section. */
export function rulebook({ extra = '', gates = 'npm run check' } = {}) {
	return ['# Demo: agent rulebook', '', 'Demo exists to be checked.', '', extra, '', '## ef-harness', '', `gates: ${gates}`, ''].join('\n');
}

export const pkg = (scripts) => JSON.stringify({ name: 'demo', scripts }, null, 2);
