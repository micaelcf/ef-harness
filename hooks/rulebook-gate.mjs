// Shared by the Claude Code and omp edit hooks. After the agent writes a markdown file, run the
// repository's own vendored checker on that file and return the findings as feedback.
//
// A repository opts in by vendoring the checker at .ef/bin/ef-check.mjs (/ef:ready does this).
// Without it the hook does nothing, so installing the plugin never changes behaviour in a repo that
// has not asked for the gates. The hook runs the vendored copy, not the plugin's, so the agent is
// held to exactly the verdict CI will reach.
//
// Trust boundary: the vendored checker is repository code, run with `node` the way the repo's own
// gates are. It runs in a child process — never inside the agent host — and is read fresh on every
// edit, so a copy /ef:ready just replaced is the copy that runs.

import { spawnSync } from 'node:child_process';
import { existsSync } from 'node:fs';
import { dirname, isAbsolute, join, relative, resolve, sep } from 'node:path';

export const VENDORED = join('.ef', 'bin', 'ef-check.mjs');

/** The nearest directory at or above `start` that has vendored the checker, or null. */
export function findOptedInRoot(start) {
	let dir = resolve(start);
	for (;;) {
		if (existsSync(join(dir, VENDORED))) return dir;
		const parent = dirname(dir);
		if (parent === dir) return null;
		dir = parent;
	}
}

function runChecker(root, only) {
	const run = spawnSync('node', [join(root, VENDORED), '--root', root, '--json', '--only', only.join(',')], {
		encoding: 'utf8',
		timeout: 20_000,
		windowsHide: true
	});
	if (run.error) throw new Error(`could not run node ${VENDORED}: ${run.error.message}`);
	try {
		return JSON.parse(run.stdout);
	} catch {
		const lines = (run.stderr || run.stdout || '').split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
		const why = lines.find((l) => /\b\w*Error\b:/.test(l)) ?? lines[0] ?? 'no output';
		throw new Error(`node ${VENDORED.split(sep).join('/')} exited ${run.status} without a report: ${why}`);
	}
}

/**
 * `editedPaths`: absolute, or relative to `cwd`. Returns null when there is nothing to say, else
 * `{ errors, warnings, text }`. Throws when the checker cannot run; the adapters report that too.
 */
export async function rulebookFeedback(cwd, editedPaths) {
	const absolute = editedPaths.filter((p) => typeof p === 'string' && p !== '').map((p) => (isAbsolute(p) ? p : resolve(cwd, p)));
	const markdown = absolute.filter((p) => p.toLowerCase().endsWith('.md'));
	if (markdown.length === 0) return null;

	const root = findOptedInRoot(dirname(markdown[0])) ?? findOptedInRoot(cwd);
	if (root === null) return null;

	const only = markdown
		.map((p) => relative(root, p))
		.filter((r) => r !== '' && !r.startsWith('..') && !isAbsolute(r))
		.map((r) => r.split(sep).join('/'));
	if (only.length === 0) return null;

	const result = runChecker(root, only);
	const errors = result.findings.filter((f) => f.level === 'error');
	const warnings = result.findings.filter((f) => f.level === 'warn');
	if (errors.length === 0 && warnings.length === 0) return null;

	const lines = [
		errors.length > 0
			? `ef-check: ${errors.length} rulebook error${errors.length > 1 ? 's' : ''} in what you just wrote. CI runs the same check (node ${VENDORED.split(sep).join('/')}); fix ${errors.length > 1 ? 'them' : 'it'} now.`
			: `ef-check: ${warnings.length} rulebook warning${warnings.length > 1 ? 's' : ''} in what you just wrote.`
	];
	for (const f of [...errors, ...warnings]) lines.push(`- ${f.level} ${f.file}:${f.line} [${f.gate}] ${f.message}`);
	return { errors: errors.length, warnings: warnings.length, text: lines.join('\n') };
}
