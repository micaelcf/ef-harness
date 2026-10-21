// Shared by the Claude Code and omp edit hooks. After the agent writes a markdown file, run the
// repository's own vendored checker on that file and return the findings as feedback.
//
// A repository opts in by vendoring the checker at .ef/bin/ef-check.mjs (/ef:ready does this).
// Without it the hook does nothing, so installing the plugin never changes behaviour in a repo that
// has not asked for the gates. The hook runs the vendored copy, not the plugin's, so the agent is
// held to exactly the verdict CI will reach.

import { existsSync } from 'node:fs';
import { dirname, isAbsolute, join, relative, resolve, sep } from 'node:path';
import { pathToFileURL } from 'node:url';

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

/**
 * `editedPaths`: absolute, or relative to `cwd`. Returns null when there is nothing to say, else
 * `{ errors, warnings, text }`.
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

	const checker = await import(pathToFileURL(join(root, VENDORED)).href);
	const result = checker.check({ root, only });
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
