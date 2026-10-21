#!/usr/bin/env node
// ef-check: deterministic rulebook gates for EF Harness.
//
// Vendored into a repository at .ef/bin/ef-check.mjs by /ef:ready. Do not edit the vendored copy:
// re-run /ef:ready to replace it, so every repository runs the same gates the harness documents.
// The format it enforces is the ef-readiness skill's references/rulebook-format.md.
//
// Zero dependencies, Node >= 18. Exit 0: no errors. Exit 1: errors. Exit 2: could not run.

import { execFileSync } from 'node:child_process';
import { existsSync, mkdirSync, readdirSync, readFileSync, realpathSync, writeFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

export const VERSION = '0.2.0';

export const BINDING_KEYS = [
	'gates',
	'generated',
	'identifier',
	'authorization',
	'tests',
	'migrations',
	'audit',
	'commits',
	'rulebook-budget'
];

export const DEFAULT_BUDGET = { rootWarn: 150, rootFail: 200, scopedFail: 200 };

const POINTER_OWN_LINES_WARN = 20;
const GAP_REASON_MIN = 10;
const IMPORT_HOPS = 4;
const ALLOW_FILE = '.ef/anchors.allow';
const VENDORED = '.ef/bin/ef-check.mjs';
const WALK_SKIP = new Set([
	'.git',
	'node_modules',
	'dist',
	'build',
	'out',
	'target',
	'vendor',
	'coverage',
	'.venv',
	'venv',
	'__pycache__',
	'.next',
	'.svelte-kit',
	'.turbo',
	'.cache'
]);
const SHELL_FENCES = new Set(['', 'sh', 'bash', 'shell', 'console', 'zsh']);
const RUNNERS = new Set(['npm', 'pnpm', 'yarn', 'bun']);
const UNVERIFIABLE_FLAGS = new Set([
	'--filter',
	'-F',
	'-w',
	'--workspace',
	'--workspaces',
	'-C',
	'--cwd',
	'--prefix',
	'--dir',
	'--directory',
	'-f',
	'--file',
	'--justfile'
]);

// ---------------------------------------------------------------------------------------------
// Repository index

/** Every file the gates may consult, as repo-relative posix paths. Git-aware when git is present. */
export function indexRepo(root) {
	let listed = null;
	try {
		const out = execFileSync('git', ['ls-files', '-z', '--cached', '--others', '--exclude-standard'], {
			cwd: root,
			encoding: 'utf8',
			stdio: ['ignore', 'pipe', 'ignore'],
			maxBuffer: 1 << 28
		});
		// --cached still lists files deleted from the worktree but not yet committed; drop them.
		listed = out.split('\0').filter((f) => f !== '' && existsSync(join(root, f)));
	} catch {
		listed = null;
	}
	const files = new Set(listed ?? walk(root, ''));
	const dirs = new Set(['']);
	for (const file of files) {
		const parts = file.split('/');
		for (let i = 1; i < parts.length; i += 1) dirs.add(parts.slice(0, i).join('/'));
	}
	return { root, files, dirs, viaGit: listed !== null };
}

function walk(root, rel) {
	const found = [];
	let entries;
	try {
		entries = readdirSync(join(root, rel), { withFileTypes: true });
	} catch {
		return found;
	}
	for (const entry of entries) {
		if (WALK_SKIP.has(entry.name)) continue;
		const path = rel === '' ? entry.name : `${rel}/${entry.name}`;
		if (entry.isDirectory()) found.push(...walk(root, path));
		else if (entry.isFile()) found.push(path);
	}
	return found;
}

function exists(index, rel) {
	const clean = rel.replace(/\/+$/, '');
	return index.files.has(clean) || index.dirs.has(clean);
}

/** posix-normalize `base/rel`; null when it escapes the repository. */
function joinRel(base, rel) {
	const out = base === '' ? [] : base.split('/');
	for (const part of rel.split('/')) {
		if (part === '' || part === '.') continue;
		if (part === '..') {
			if (out.length === 0) return null;
			out.pop();
		} else out.push(part);
	}
	return out.join('/');
}

function dirOf(rel) {
	const i = rel.lastIndexOf('/');
	return i === -1 ? '' : rel.slice(0, i);
}

function baseName(rel) {
	return rel.slice(rel.lastIndexOf('/') + 1);
}

// ---------------------------------------------------------------------------------------------
// Markdown

const textCache = new Map();

function readText(index, rel) {
	const key = `${index.root}\0${rel}`;
	if (!textCache.has(key)) {
		let text = '';
		try {
			text = readFileSync(join(index.root, rel), 'utf8');
		} catch {
			text = '';
		}
		textCache.set(key, text);
	}
	return textCache.get(key);
}

function splitLines(text) {
	const lines = text.split(/\r?\n/);
	if (lines.length > 0 && lines[lines.length - 1] === '') lines.pop();
	return lines;
}

/** Lines annotated with fence state. `fence` is the info string of the enclosing fence, or null. */
export function parseMarkdown(text) {
	const out = [];
	let open = null;
	for (const raw of splitLines(text)) {
		const marker = raw.match(/^\s*(`{3,}|~{3,})\s*([^\s`]*)/);
		if (open === null && marker) {
			open = { char: marker[1][0], len: marker[1].length, info: marker[2].toLowerCase() };
			out.push({ text: raw, fence: null, marker: true });
			continue;
		}
		if (open !== null && marker && marker[1][0] === open.char && marker[1].length >= open.len && marker[2] === '') {
			open = null;
			out.push({ text: raw, fence: null, marker: true });
			continue;
		}
		out.push({ text: raw, fence: open === null ? null : open.info, marker: false });
	}
	return out;
}

/** Inline code spans in one line, plus the line with spans blanked out. */
function codeSpans(line) {
	const spans = [];
	let prose = '';
	let i = 0;
	while (i < line.length) {
		if (line[i] !== '`') {
			prose += line[i];
			i += 1;
			continue;
		}
		let run = 0;
		while (line[i + run] === '`') run += 1;
		const fence = '`'.repeat(run);
		let close = line.indexOf(fence, i + run);
		while (close !== -1 && line[close + run] === '`') close = line.indexOf(fence, close + run + 1);
		if (close === -1) {
			prose += line.slice(i, i + run);
			i += run;
			continue;
		}
		spans.push(line.slice(i + run, close).trim());
		prose += ' '.repeat(close + run - i);
		i = close + run;
	}
	return { spans, prose };
}

function headingOf(line) {
	const match = line.match(/^\s{0,3}(#{1,6})\s+(.*?)\s*#*\s*$/);
	return match ? { level: match[1].length, title: match[2] } : null;
}

/** `@path` imports outside code, resolved against the importing file; existing files only. */
function importsOf(index, rel) {
	const found = [];
	for (const line of parseMarkdown(readText(index, rel))) {
		if (line.fence !== null || line.marker) continue;
		const { prose } = codeSpans(line.text);
		for (const match of prose.matchAll(/(?:^|[\s(])@([^\s`)\]]+)/g)) {
			const target = joinRel(dirOf(rel), match[1].replace(/\\ /g, ' '));
			if (target !== null && index.files.has(target)) found.push(target);
		}
	}
	return found;
}

/** A file plus everything it imports, depth-first, up to four hops, each file once. */
function loadedSet(index, entry) {
	const order = [];
	const seen = new Set();
	const visit = (rel, depth) => {
		if (seen.has(rel) || depth > IMPORT_HOPS) return;
		seen.add(rel);
		order.push(rel);
		for (const next of importsOf(index, rel)) visit(next, depth + 1);
	};
	visit(entry, 0);
	return order;
}

// ---------------------------------------------------------------------------------------------
// Rulebooks

/** Each directory holding a rulebook: its primary file, and any CLAUDE.md pointers beside it. */
export function findScopes(index) {
	const byDir = new Map();
	const scope = (dir) => {
		if (!byDir.has(dir)) byDir.set(dir, { dir, agents: null, claude: [] });
		return byDir.get(dir);
	};
	for (const file of index.files) {
		const name = baseName(file);
		if (name === 'AGENTS.md') scope(dirOf(file)).agents = file;
		else if (name === 'CLAUDE.md') {
			const dir = file === '.claude/CLAUDE.md' ? '' : dirOf(file);
			scope(dir).claude.push(file);
		}
	}
	const scopes = [];
	for (const s of byDir.values()) {
		s.claude.sort();
		const primary = s.agents ?? s.claude[0];
		const pointers = s.agents ? s.claude : [];
		scopes.push({ dir: s.dir, primary, pointers, root: s.dir === '' });
	}
	scopes.sort((a, b) => a.dir.localeCompare(b.dir));
	return scopes;
}

/** The files a tool loads for a scope: its pointers and the rulebook, with their imports. */
function scopeLoaded(index, scope) {
	const order = [];
	const add = (rel) => {
		for (const f of loadedSet(index, rel)) if (!order.includes(f)) order.push(f);
	};
	for (const pointer of scope.pointers) add(pointer);
	add(scope.primary);
	return order;
}

function lineCount(index, rel) {
	return splitLines(readText(index, rel)).length;
}

function sectionLines(index, rel, predicate) {
	const lines = parseMarkdown(readText(index, rel));
	const sections = [];
	for (let i = 0; i < lines.length; i += 1) {
		if (lines[i].fence !== null || lines[i].marker) continue;
		const heading = headingOf(lines[i].text);
		if (!heading || !predicate(heading.title)) continue;
		let end = lines.length;
		for (let j = i + 1; j < lines.length; j += 1) {
			if (lines[j].fence !== null || lines[j].marker) continue;
			const next = headingOf(lines[j].text);
			if (next && next.level <= heading.level) {
				end = j;
				break;
			}
		}
		sections.push({ start: i, end, lines, heading });
	}
	return sections;
}

const isInvariantsTitle = (title) => /\binvariants?\b/i.test(title);
const isBindingsTitle = (title) => title.trim().replace(/`/g, '').toLowerCase() === 'ef-harness';

// ---------------------------------------------------------------------------------------------
// Commands

function packageScripts(index, dir) {
	const rel = dir === '' ? 'package.json' : `${dir}/package.json`;
	if (!index.files.has(rel)) return null;
	try {
		const parsed = JSON.parse(readText(index, rel));
		return parsed && typeof parsed.scripts === 'object' && parsed.scripts !== null ? parsed.scripts : {};
	} catch {
		return {};
	}
}

function makeTargets(index, dir) {
	for (const name of ['GNUmakefile', 'makefile', 'Makefile']) {
		const rel = dir === '' ? name : `${dir}/${name}`;
		if (!index.files.has(rel)) continue;
		const targets = new Set();
		for (const line of splitLines(readText(index, rel))) {
			const match = line.match(/^([A-Za-z0-9_./%-][A-Za-z0-9_./% -]*?)\s*::?(?!=)/);
			if (match) for (const t of match[1].split(/\s+/)) if (t !== '') targets.add(t);
		}
		return targets;
	}
	return null;
}

function justRecipes(index, dir) {
	for (const name of ['justfile', 'Justfile', '.justfile']) {
		const rel = dir === '' ? name : `${dir}/${name}`;
		if (!index.files.has(rel)) continue;
		const recipes = new Set();
		for (const line of splitLines(readText(index, rel))) {
			const alias = line.match(/^alias\s+([A-Za-z0-9_-]+)\s*:=/);
			if (alias) recipes.add(alias[1]);
			const match = line.match(/^@?([A-Za-z0-9_-]+)(?:\s+[^:=]*)?:(?!=)/);
			if (match) recipes.add(match[1]);
		}
		return recipes;
	}
	return null;
}

function dirsUpward(dir) {
	const out = [dir];
	let current = dir;
	while (current !== '') {
		current = dirOf(current);
		out.push(current);
	}
	return out;
}

/**
 * Classify one command string. `kind: null` means it is not a form the gate understands at all;
 * `verifiable: false` means it is a known form the checker cannot settle (workspace flags).
 */
export function resolveCommand(index, fromDir, command) {
	const tokens = command
		.replace(/^\$\s+/, '')
		.trim()
		.split(/\s+/)
		.filter((t) => t !== '');
	if (tokens.length === 0) return { kind: null };
	const [bin, ...rest] = tokens;
	const flags = rest.filter((t) => t.startsWith('-'));
	const unverifiable = flags.some((f) => UNVERIFIABLE_FLAGS.has(f.split('=')[0]));

	let kind = null;
	let name = null;
	if (RUNNERS.has(bin)) {
		const runAt = rest.findIndex((t) => t === 'run' || t === 'run-script');
		if (runAt !== -1) {
			name = rest.slice(runAt + 1).find((t) => !t.startsWith('-')) ?? null;
			kind = 'script';
		} else if (bin !== 'bun' && rest[0] === 'test') {
			name = 'test';
			kind = 'script';
		} else return { kind: null };
		if (name === null) return { kind: null };
		// `bun run src/x.ts` runs a file, which the anchors gate covers.
		if (bin === 'bun' && (name.includes('/') || /\.[cm]?[jt]sx?$/.test(name))) return { kind: null };
	} else if (bin === 'make' || bin === 'just') {
		name = rest.find((t) => !t.startsWith('-') && !t.includes('=')) ?? null;
		if (name === null) return { kind: null };
		kind = bin === 'make' ? 'make' : 'just';
	} else return { kind: null };

	if (unverifiable) return { kind, name, verifiable: false };

	const searched = [];
	for (const dir of dirsUpward(fromDir)) {
		const table =
			kind === 'script' ? packageScripts(index, dir) : kind === 'make' ? makeTargets(index, dir) : justRecipes(index, dir);
		if (table === null) continue;
		const file = kind === 'script' ? 'package.json' : kind === 'make' ? 'Makefile' : 'justfile';
		searched.push(dir === '' ? file : `${dir}/${file}`);
		const has = kind === 'script' ? Object.prototype.hasOwnProperty.call(table, name) : table.has(name);
		if (has) return { kind, name, verifiable: true, ok: true, searched };
	}
	return { kind, name, verifiable: true, ok: false, searched };
}

function describeMissing(result, command) {
	const what =
		result.kind === 'script' ? `script "${result.name}"` : result.kind === 'make' ? `make target "${result.name}"` : `just recipe "${result.name}"`;
	const where = result.searched.length > 0 ? `checked ${result.searched.join(', ')}` : 'no such file between here and the root';
	return `\`${command}\` names a ${what} that does not exist (${where}). A command the agent cannot run teaches it to stop trusting the rulebook.`;
}

// ---------------------------------------------------------------------------------------------
// Gates

function finding(level, gate, file, line, message) {
	return { level, gate, file, line, message };
}

function gateAnchors(index, mdFiles, rulebooks, findings, stats) {
	const allow = readAllow(index, findings);
	let checked = 0;
	const lineCache = new Map();
	const linesOf = (rel) => {
		if (!lineCache.has(rel)) lineCache.set(rel, lineCount(index, rel));
		return lineCache.get(rel);
	};

	let historical = 0;
	for (const doc of mdFiles) {
		const docDir = dirOf(doc);
		const lines = parseMarkdown(readText(index, doc));
		// A rulebook is never a record: it is loaded as current truth, so its citations must be.
		const record = rulebooks.has(doc) ? null : allow.record(doc);
		if (record !== null) record.used = true;
		const level = record === null ? 'error' : 'warn';
		const report = (line, message) => {
			if (record !== null) historical += 1;
			findings.push(finding(level, 'anchors', doc, line, record === null ? message : `${message} (a record; warning only)`));
		};
		lines.forEach((line, i) => {
			if (line.fence !== null || line.marker) return;
			const { spans, prose } = codeSpans(line.text);
			const candidates = [];
			for (const span of spans) for (const token of span.split(/\s+/)) candidates.push({ token, bases: [docDir, ''], link: false });
			for (const match of prose.matchAll(/\]\(\s*<?([^)\s>]+)>?(?:\s+["'][^)]*["'])?\s*\)/g))
				candidates.push({ token: match[1], bases: [docDir], link: true });
			for (const match of prose.matchAll(/^\s{0,3}\[[^\]]+\]:\s*<?(\S+?)>?(?:\s|$)/g))
				candidates.push({ token: match[1], bases: [docDir], link: true });

			for (const candidate of candidates) {
				const cited = citation(candidate);
				if (cited === null) continue;
				const verdict = verify(index, cited);
				if (verdict === null) continue;
				checked += 1;
				const key = verdict.resolved.replace(/\/+$/, '');
				const allowed = allow.match(key);
				if (allowed !== null) {
					allow.used.add(allowed);
					continue;
				}
				if (!verdict.found) {
					report(i + 1, `cites ${cited.raw}, which does not exist. Fix the citation, or add it to ${ALLOW_FILE} with a reason if the document cites it as gone.`);
				} else if (cited.line !== null && (cited.line < 1 || (cited.lineEnd !== null && cited.lineEnd < cited.line))) {
					report(i + 1, `cites ${cited.raw}, which is not a line range: lines start at 1 and a range ends after it starts.`);
				} else if (cited.line !== null && index.files.has(verdict.found)) {
					const total = linesOf(verdict.found);
					const last = cited.lineEnd ?? cited.line;
					if (last > total) report(i + 1, `cites ${cited.raw}, but ${verdict.found} has ${total} lines. The code moved; update the line.`);
				}
			}
		});
	}

	for (const [key, entry] of allow.entries) {
		if (!allow.used.has(key))
			findings.push(finding('warn', 'anchors', ALLOW_FILE, entry.line, `${key} is allowed but no document cites it; remove the entry.`));
		else if (exists(index, key))
			findings.push(finding('warn', 'anchors', ALLOW_FILE, entry.line, `${key} exists again; remove the entry so the citation is checked.`));
	}
	for (const [path, entry] of allow.records) {
		if (!entry.used) findings.push(finding('warn', 'anchors', ALLOW_FILE, entry.line, `doc ${path} matches no markdown file; remove the entry.`));
	}
	stats.anchors = { checked, allowed: allow.used.size, historical };
}

function citation({ token, bases, link }) {
	let t = token.replace(/^[("'[]+/, '').replace(/[)"'\],;.!?]+$/, '');
	if (link) {
		if (/^[a-z][a-z0-9+.-]*:/i.test(t) || t.startsWith('#')) return null;
		try {
			t = decodeURIComponent(t);
		} catch {
			// keep the raw target
		}
		t = t.replace(/\?.*$/, '');
	}
	let line = null;
	let lineEnd = null;
	const hashLine = t.match(/#L(\d+)(?:-L?(\d+))?$/);
	if (hashLine) {
		line = Number(hashLine[1]);
		lineEnd = hashLine[2] ? Number(hashLine[2]) : null;
		t = t.slice(0, hashLine.index);
	} else if (link) t = t.replace(/#.*$/, '');
	const colonLine = t.match(/:(\d+)(?:-(\d+))?$/);
	if (colonLine) {
		line = Number(colonLine[1]);
		lineEnd = colonLine[2] ? Number(colonLine[2]) : null;
		t = t.slice(0, colonLine.index);
	}
	if (!t.includes('/')) return null;
	if (/[*<>{}$|\\]/.test(t) || t.includes('://') || t.includes('//')) return null;
	if (!link && (t.startsWith('/') || t.startsWith('@') || t.startsWith('#') || t.startsWith('~'))) return null;
	if (!/^[A-Za-z0-9_.@~+\-/ ]+$/.test(t)) return null;
	let useBases = bases;
	if (link && t.startsWith('/')) {
		useBases = [''];
		t = t.slice(1);
	}
	return { raw: token.replace(/[)"'\],;.!?]+$/, ''), path: t, bases: useBases, line, lineEnd };
}

/**
 * null: not a claim about this repository (its first real segment exists under no base).
 * Otherwise `found` is the first existing resolution, or null when every rooted one is missing.
 */
function verify(index, cited) {
	let rooted = null;
	for (const base of cited.bases) {
		const parts = cited.path.split('/');
		let prefix = base;
		let k = 0;
		while (k < parts.length && (parts[k] === '.' || parts[k] === '..' || parts[k] === '')) {
			prefix = parts[k] === '..' ? (prefix === '' ? null : dirOf(prefix)) : prefix;
			if (prefix === null) break;
			k += 1;
		}
		if (prefix === null || k >= parts.length) continue;
		const first = joinRel(prefix, parts[k]);
		if (first === null || !exists(index, first)) continue;
		const full = joinRel(base, cited.path);
		if (full === null) continue;
		if (rooted === null) rooted = full;
		if (exists(index, full)) return { resolved: full, found: full.replace(/\/+$/, '') };
	}
	return rooted === null ? null : { resolved: rooted, found: null };
}

function readAllow(index, findings) {
	const entries = new Map();
	const records = new Map();
	const none = { entries, records, used: new Set(), match: () => null, record: () => null };
	if (!index.files.has(ALLOW_FILE)) return none;
	splitLines(readText(index, ALLOW_FILE)).forEach((raw, i) => {
		const line = raw.trim();
		if (line === '' || line.startsWith('#')) return;
		const at = line.search(/\s#/);
		let written = (at === -1 ? line : line.slice(0, at)).trim();
		const isRecord = /^doc\s+/.test(written);
		if (isRecord) written = written.replace(/^doc\s+/, '');
		written = written.replace(/^\.\//, '');
		const path = written.replace(/\/+$/, '');
		const reason = at === -1 ? '' : line.slice(at).replace(/^\s*#\s*/, '').trim();
		if (reason === '') {
			const why = isRecord ? 'why these documents are records that keep the paths of their day' : 'why the document cites it as gone';
			findings.push(finding('error', 'anchors', ALLOW_FILE, i + 1, `${path} has no reason. Write "${line}  # <${why}>".`));
			return;
		}
		if (isRecord) records.set(path, { line: i + 1, reason, used: false });
		else entries.set(path, { line: i + 1, reason, prefix: written.endsWith('/') });
	});
	const match = (key) => {
		if (entries.has(key)) return key;
		for (const [path, entry] of entries) if (entry.prefix && key.startsWith(`${path}/`)) return path;
		return null;
	};
	/** The record entry covering a citing document: its stale citations are history, so warnings. */
	const record = (doc) => {
		for (const [path, entry] of records) if (doc === path || doc.startsWith(`${path}/`)) return entry;
		return null;
	};
	return { entries, records, used: new Set(), match, record };
}

function gateCommands(index, scopes, findings, stats) {
	let named = 0;
	let unverifiable = 0;
	const seen = new Set();
	for (const scope of scopes) {
		for (const file of scopeLoaded(index, scope)) {
			if (seen.has(file)) continue;
			seen.add(file);
			const fromDir = dirOf(file);
			parseMarkdown(readText(index, file)).forEach((line, i) => {
				if (line.marker) return;
				const commands = [];
				if (line.fence !== null) {
					if (SHELL_FENCES.has(line.fence)) commands.push(line.text.trim());
				} else commands.push(...codeSpans(line.text).spans);
				for (const text of commands) {
					for (const part of text.split(/&&|\|\||;/)) {
						const command = part.trim();
						const result = resolveCommand(index, fromDir, command);
						if (result.kind === null) continue;
						named += 1;
						if (!result.verifiable) {
							unverifiable += 1;
							continue;
						}
						if (!result.ok) findings.push(finding('error', 'commands', file, i + 1, describeMissing(result, command)));
					}
				}
			});
		}
	}
	stats.commands = { named, unverifiable };
}

function gateBudget(index, scopes, budget, findings, stats) {
	stats.budget = { limits: budget, scopes: [] };
	for (const scope of scopes) {
		const files = scopeLoaded(index, scope);
		const breakdown = files.map((f) => ({ file: f, lines: lineCount(index, f) }));
		const lines = breakdown.reduce((sum, b) => sum + b.lines, 0);
		const chars = files.reduce((sum, f) => sum + readText(index, f).length, 0);
		const tokens = Math.ceil(chars / 4);
		stats.budget.scopes.push({ dir: scope.dir, root: scope.root, primary: scope.primary, lines, tokens, breakdown });
		const detail = breakdown.length > 1 ? ` (${breakdown.map((b) => `${b.file} ${b.lines}`).join(' + ')})` : '';
		const where = scope.root ? scope.pointers[0] ?? scope.primary : scope.primary;
		if (scope.root) {
			if (lines > budget.rootFail)
				findings.push(
					finding(
						'error',
						'budget',
						scope.primary,
						1,
						`the root loads ${lines} lines every session${detail}; the limit is ${budget.rootFail}. Move subtree rules to scoped rulebooks and enforceable rules into checks.`
					)
				);
			else if (lines > budget.rootWarn)
				findings.push(finding('warn', 'budget', scope.primary, 1, `the root loads ${lines} lines every session${detail}; aim for ${budget.rootWarn} or fewer.`));
		} else if (lines > budget.scopedFail) {
			findings.push(finding('error', 'budget', where, 1, `this rulebook loads ${lines} lines${detail}; the limit is ${budget.scopedFail}.`));
		}
	}
}

function gateRouting(index, scopes, findings, stats) {
	const root = scopes.find((s) => s.root);
	const nested = scopes.filter((s) => !s.root);
	const text = root ? scopeLoaded(index, root).map((f) => readText(index, f)).join('\n') : '';
	let unrouted = 0;
	for (const scope of nested) {
		if (text.includes(scope.primary)) continue;
		unrouted += 1;
		findings.push(
			finding(
				'error',
				'routing',
				scope.primary,
				1,
				`no line in the root rulebook names ${scope.primary}. omp never loads a rulebook below the session directory, and Claude Code loads it only after reading a file in ${scope.dir}/, so the root must say when to open it ("Editing ${scope.dir}/** → read ${scope.primary}").`
			)
		);
	}
	stats.routing = { scoped: nested.length, unrouted };
}

export function invariantsOf(index, rel) {
	const items = [];
	for (const section of sectionLines(index, rel, isInvariantsTitle)) {
		const { lines, start, end } = section;
		let indent = null;
		let current = null;
		let blankBefore = false;
		for (let i = start + 1; i < end; i += 1) {
			const { text, fence, marker } = lines[i];
			const item = fence === null && !marker ? text.match(/^(\s*)(?:\d+[.)]|[-*+])\s+(.*)$/) : null;
			if (item && (indent === null || item[1].length <= indent)) {
				indent = item[1].length;
				current = { line: i + 1, body: [item[2]] };
				items.push(current);
				blankBefore = false;
				continue;
			}
			if (current === null) continue;
			if (text.trim() === '') {
				blankBefore = true;
				continue;
			}
			const leading = text.match(/^\s*/)[0].length;
			// A non-indented paragraph after a blank line has left the list.
			if (blankBefore && leading <= indent && fence === null && !marker) {
				current = null;
				continue;
			}
			blankBefore = false;
			if (fence === null && !marker) current.body.push(text.trim());
		}
	}
	return items.map((it) => {
		const body = it.body.join(' ');
		const plain = body.replace(/[*_]/g, '');
		const summary = plain.replace(/\s+/g, ' ').slice(0, 70).trim();
		const match = plain.match(/\bCheck\s*:\s*(.*)$/);
		if (!match) return { line: it.line, summary, status: 'missing' };
		const after = match[1].trim();
		if (/^none\b/i.test(after)) {
			const reason = after.replace(/^none\b/i, '').replace(/^[\s—–:,.-]+/, '').trim();
			return { line: it.line, summary, status: reason.length >= GAP_REASON_MIN ? 'gap' : 'gap-unexplained', reason };
		}
		return { line: it.line, summary, status: 'checked' };
	});
}

function gateChecks(index, scopes, findings, stats) {
	const counts = { invariants: 0, checked: 0, gaps: [] };
	for (const scope of scopes) {
		for (const file of scopeLoaded(index, scope)) {
			if (scope.pointers.includes(file)) continue;
			for (const inv of invariantsOf(index, file)) {
				counts.invariants += 1;
				if (inv.status === 'checked') counts.checked += 1;
				else if (inv.status === 'gap') counts.gaps.push({ file, line: inv.line, summary: inv.summary, reason: inv.reason });
				else if (inv.status === 'gap-unexplained')
					findings.push(
						finding('error', 'checks', file, inv.line, `"${inv.summary}" says "Check: none" without a reason. Say why nothing can check it yet and what catches it instead.`)
					);
				else
					findings.push(
						finding(
							'error',
							'checks',
							file,
							inv.line,
							`"${inv.summary}" has no Check:. State what fails when it is violated, or write "Check: none — <why nothing checks it yet>". A rule with no check is a wish.`
						)
					);
			}
		}
	}
	stats.checks = counts;
}

function gateSingleSource(index, scopes, findings, stats) {
	let pointers = 0;
	for (const scope of scopes) {
		if (scope.pointers.length === 0) continue;
		const importing = scope.pointers.filter((p) => importsOf(index, p).includes(scope.primary));
		for (const pointer of scope.pointers) {
			pointers += 1;
			if (sectionLines(index, pointer, isInvariantsTitle).length > 0 || sectionLines(index, pointer, isBindingsTitle).length > 0)
				findings.push(
					finding('error', 'single-source', pointer, 1, `holds rules of its own beside ${scope.primary}. Two rulebooks drift, and the one you are not reading is the wrong one; move them into ${scope.primary}.`)
				);
			const own = splitLines(readText(index, pointer)).filter((l) => l.trim() !== '' && !/^\s*@\S+\s*$/.test(l)).length;
			if (own > POINTER_OWN_LINES_WARN)
				findings.push(finding('warn', 'single-source', pointer, 1, `carries ${own} lines of its own beside ${scope.primary}; a pointer should carry the import and little else.`));
		}
		// Every pointer, not just one: omp keeps only one file per scope, and it may be the one
		// without the import.
		for (const pointer of scope.pointers) {
			if (importing.includes(pointer)) continue;
			const target = baseName(scope.primary);
			const others = scope.pointers.length > 1 ? ' Each pointer needs it: omp loads only one of them, and it may be this one.' : '';
			findings.push(
				finding(
					'error',
					'single-source',
					pointer,
					1,
					`sits beside ${scope.primary} but does not import it. Claude Code and omp both load only CLAUDE.md when both exist, so ${scope.primary} never loads from here. Add a line reading "@${pointer === '.claude/CLAUDE.md' ? `../${target}` : target}".${others}`
				)
			);
		}
	}
	stats.singleSource = { pointers };
}

/** Parse the `ef-harness` block from the root's loaded files. */
export function readBindings(index, files) {
	for (const file of files) {
		const sections = sectionLines(index, file, isBindingsTitle);
		if (sections.length === 0) continue;
		const { lines, start, end } = sections[0];
		const keys = [];
		let last = null;
		for (let i = start + 1; i < end; i += 1) {
			const { text, marker } = lines[i];
			if (marker || text.trim() === '') continue;
			const match = text.match(/^\s*(?:[-*]\s+)?`?([a-z][a-z-]{0,30})`?\s*:\s*(.*)$/);
			if (match && !/^\s{2,}/.test(text)) {
				last = { key: match[1], value: match[2].trim(), line: i + 1 };
				keys.push(last);
			} else if (last && /^\s+\S/.test(text)) last.value = `${last.value} ${text.trim()}`.trim();
		}
		return { file, line: start + 1, keys };
	}
	return null;
}

export function parseBudget(value) {
	const root = value.match(/\broot\s+(\d+)\s*\/\s*(\d+)/i);
	const scoped = value.match(/\bscoped\s+(\d+)/i);
	const reason = value.split(/\s(?:—|--)\s*/).slice(1).join(' ').trim();
	if ((!root && !scoped) || reason === '') return null;
	const budget = { ...DEFAULT_BUDGET };
	if (root) {
		budget.rootWarn = Number(root[1]);
		budget.rootFail = Number(root[2]);
	}
	if (scoped) budget.scopedFail = Number(scoped[1]);
	if (budget.rootWarn > budget.rootFail) return null;
	return { budget, reason };
}

function gateBindings(index, rootScope, findings, stats) {
	const files = rootScope ? scopeLoaded(index, rootScope) : [];
	const bindings = readBindings(index, files);
	let budget = { ...DEFAULT_BUDGET };
	stats.bindings = { present: bindings !== null, gates: 0 };
	if (bindings === null) {
		findings.push(
			finding(
				'error',
				'bindings',
				rootScope?.primary ?? 'AGENTS.md',
				1,
				'no "## ef-harness" bindings block. Without it Stage 4 re-derives the gates on every feature; run /ef:ready to write it.'
			)
		);
		return budget;
	}
	const gates = bindings.keys.find((k) => k.key === 'gates');
	for (const entry of bindings.keys) {
		if (!BINDING_KEYS.includes(entry.key))
			findings.push(finding('error', 'bindings', bindings.file, entry.line, `unknown key "${entry.key}:". Known keys: ${BINDING_KEYS.join(', ')}.`));
	}
	if (!gates || gates.value.replace(/`/g, '').trim() === '') {
		findings.push(finding('error', 'bindings', bindings.file, gates?.line ?? bindings.line, '"gates:" is missing or empty. Name the commands that must pass before Stage 5, in order.'));
	} else {
		const commands = gates.value
			.split(/,|;|&&|·/)
			.map((c) => c.replace(/`/g, '').trim())
			.filter((c) => c !== '');
		stats.bindings.gates = commands.length;
		for (const command of commands) {
			const result = resolveCommand(index, '', command);
			if (result.kind !== null && result.verifiable && !result.ok)
				findings.push(finding('error', 'bindings', bindings.file, gates.line, describeMissing(result, command)));
		}
		if (index.files.has(VENDORED) && !commands.some((c) => c.includes('ef-check')))
			findings.push(finding('warn', 'bindings', bindings.file, gates.line, `${VENDORED} is vendored but no gate runs it, so Stage 4 never checks the rulebook. Add "node ${VENDORED}" to gates.`));
	}
	const override = bindings.keys.find((k) => k.key === 'rulebook-budget');
	if (override) {
		const parsed = parseBudget(override.value);
		if (parsed === null)
			findings.push(
				finding(
					'error',
					'bindings',
					bindings.file,
					override.line,
					'"rulebook-budget:" must read "root <warn>/<fail>, scoped <fail> — <reason>" (either part may be omitted; the reason may not). The defaults apply.'
				)
			);
		else budget = parsed.budget;
	}
	return budget;
}

function globRegex(pattern) {
	let out = '';
	for (let i = 0; i < pattern.length; i += 1) {
		const ch = pattern[i];
		if (pattern.startsWith('**/', i)) {
			out += '(?:.*/)?';
			i += 2;
		} else if (pattern.startsWith('**', i)) {
			out += '.*';
			i += 1;
		} else if (ch === '*') out += '[^/]*';
		else if (ch === '{') {
			const close = pattern.indexOf('}', i);
			if (close === -1) out += '\\{';
			else {
				out += `(?:${pattern
					.slice(i + 1, close)
					.split(',')
					.map((s) => s.replace(/[.+?^$()|[\]\\]/g, '\\$&'))
					.join('|')})`;
				i = close;
			}
		} else out += ch.replace(/[.+?^$()|[\]\\]/g, '\\$&');
	}
	return new RegExp(`^${out}$`);
}

const isGlob = (p) => /[*{]/.test(p);

/** Whether two `Owns:` entries can name the same file. Exact duplicates are handled separately. */
export function ownershipOverlaps(a, b) {
	const norm = (p) => (p.endsWith('/') ? `${p}**` : p);
	const [x, y] = [norm(a), norm(b)];
	if (!isGlob(x) && !isGlob(y)) return false;
	if (!isGlob(x)) return globRegex(y).test(x);
	if (!isGlob(y)) return globRegex(x).test(y);
	const prefix = (p) => p.slice(0, p.search(/[*{]/));
	const [px, py] = [prefix(x), prefix(y)];
	// The glob with the shorter literal prefix covers the other only if it recurses from there.
	if (px.startsWith(py) && y.slice(py.length).startsWith('**')) return true;
	if (py.startsWith(px) && x.slice(px.length).startsWith('**')) return true;
	return false;
}

// ---------------------------------------------------------------------------------------------
// Feature checklists: .ef/<feature>/ (format: the ef-implement skill's references/checklist-format.md)

export const FEATURE_BUDGET = { slice: 150, contract: 200 };
const CHECK_DEF = /^\s*\*\*C(\d+)\*\*/;
const REQ_TOKEN = /\b([A-Z][A-Z0-9]*)-(\d+)\b/g;
const CHECK_REF = /\bC(\d+)(?:\s*[–-]\s*C?(\d+))?\b/g;
const HISTORY_TITLE = /^(log|stage \d|handoff|landed)\b/i;

/** `.ef/<name>/` directories holding a `checks.md`. Read from disk: `.ef/` is often untracked. */
export function featureDirs(root) {
	let entries;
	try {
		entries = readdirSync(join(root, '.ef'), { withFileTypes: true });
	} catch {
		return [];
	}
	return entries
		.filter((e) => e.isDirectory() && e.name !== 'bin' && existsSync(join(root, '.ef', e.name, 'checks.md')))
		.map((e) => `.ef/${e.name}`)
		.sort();
}

function mdIn(root, relDir) {
	try {
		return readdirSync(join(root, relDir), { withFileTypes: true })
			.filter((e) => e.isFile() && e.name.toLowerCase().endsWith('.md'))
			.map((e) => `${relDir}/${e.name}`)
			.sort();
	} catch {
		return [];
	}
}

/** Check definitions (`**C<n>** …`) with whether a `Proof:` follows before the next check or heading. */
export function checksIn(index, rel) {
	const out = [];
	let current = null;
	parseMarkdown(readText(index, rel)).forEach((l, i) => {
		if (l.fence !== null || l.marker) return;
		const def = l.text.match(CHECK_DEF);
		if (def) {
			current = { id: Number(def[1]), file: rel, line: i + 1, text: l.text, proof: false };
			out.push(current);
		} else if (headingOf(l.text)) current = null;
		else if (current && /^\s*Proof\s*:/.test(l.text)) current.proof = true;
	});
	return out;
}

/** Check ids cited outside their definition, skipping code spans and history sections. */
function checkRefs(index, rel) {
	const refs = [];
	let history = false;
	parseMarkdown(readText(index, rel)).forEach((l, i) => {
		if (l.fence !== null || l.marker) return;
		const heading = headingOf(l.text);
		if (heading && heading.level <= 2) history = HISTORY_TITLE.test(heading.title);
		if (history) return;
		const { prose } = codeSpans(l.text.replace(CHECK_DEF, ''));
		for (const m of prose.matchAll(CHECK_REF)) {
			const from = Number(m[1]);
			const to = m[2] === undefined ? from : Number(m[2]);
			if (to < from || to - from > 500) continue;
			for (let id = from; id <= to; id += 1) refs.push({ id, file: rel, line: i + 1 });
		}
	});
	return refs;
}

function lineOf(index, rel, pattern) {
	const at = splitLines(readText(index, rel)).findIndex((l) => pattern.test(l));
	return at === -1 ? null : { line: at + 1, text: splitLines(readText(index, rel))[at] };
}

function gateFeatures(index, findings, stats) {
	const summary = { features: 0, checks: 0, slices: 0 };
	for (const dir of featureDirs(index.root)) {
		summary.features += 1;
		const indexFile = `${dir}/checks.md`;
		const slices = mdIn(index.root, `${dir}/slices`);
		const contract = mdIn(index.root, `${dir}/contract`);
		const split = slices.length > 0 || contract.length > 0;
		const defining = split ? slices : [indexFile];
		const citing = split ? [indexFile, ...slices, ...mdIn(index.root, dir).filter((f) => f === `${dir}/verification.md`)] : [indexFile];

		// Unique ids, each with a proof.
		const checks = defining.flatMap((f) => checksIn(index, f));
		summary.checks += checks.length;
		summary.slices += slices.length;
		const seen = new Map();
		for (const c of checks) {
			if (seen.has(c.id)) {
				const first = seen.get(c.id);
				findings.push(finding('error', 'feature', c.file, c.line, `C${c.id} is already defined at ${first.file}:${first.line}. Check ids are unique across the feature; number straight through.`));
			} else seen.set(c.id, c);
			if (!c.proof) findings.push(finding('error', 'feature', c.file, c.line, `C${c.id} has no "Proof:" line. Name the specific test whose exit code settles it.`));
		}
		if (split && checksIn(index, indexFile).length > 0)
			findings.push(finding('error', 'feature', indexFile, 1, 'defines checks, but this feature is split: checks live in slices/*.md, where their builders read them.'));

		// Every cited check exists.
		for (const ref of citing.flatMap((f) => checkRefs(index, f)))
			if (!seen.has(ref.id)) findings.push(finding('error', 'feature', ref.file, ref.line, `cites C${ref.id}, which no check defines.`));

		// Requirements: every owned id is cited by a check; every cited id with an owned prefix is owned.
		const reqSection = sectionLines(index, indexFile, (t) => /^requirements?\b/i.test(t))[0];
		if (!reqSection) {
			findings.push(finding('warn', 'feature', indexFile, 1, 'no "## Requirements" section, so requirement coverage is not checked. List the requirement ids this repo owns.'));
		} else {
			const owned = new Map();
			for (let i = reqSection.start + 1; i < reqSection.end; i += 1)
				for (const m of reqSection.lines[i].text.matchAll(REQ_TOKEN)) if (!owned.has(m[0])) owned.set(m[0], i + 1);
			const prefixes = new Set([...owned.keys()].map((id) => id.replace(/-\d+$/, '')));
			const cited = new Set();
			for (const c of checks) {
				for (const m of c.text.matchAll(REQ_TOKEN)) {
					if (!prefixes.has(m[1])) continue;
					cited.add(m[0]);
					if (!owned.has(m[0])) findings.push(finding('error', 'feature', c.file, c.line, `C${c.id} cites ${m[0]}, which "## Requirements" does not list. A typo, or a requirement this repo does not own.`));
				}
			}
			for (const [id, line] of owned)
				if (!cited.has(id)) findings.push(finding('error', 'feature', indexFile, line, `${id} is owned here but no check cites it. Every owned requirement needs a check that proves it.`));
			if (owned.size === 0) findings.push(finding('warn', 'feature', indexFile, reqSection.start + 1, '"## Requirements" lists no requirement ids.'));
		}

		if (!split) continue;

		// Every slice file is in the index, and every slice the index names exists.
		const indexText = readText(index, indexFile);
		for (const s of slices) {
			const name = s.slice(dir.length + 1);
			if (!indexText.includes(name)) findings.push(finding('error', 'feature', s, 1, `${indexFile} does not list ${name}. The index is how the lead and the auditor find a slice.`));
		}
		splitLines(indexText).forEach((l, i) => {
			for (const m of l.matchAll(/\bslices\/[\w.-]+\.md\b/g))
				if (!existsSync(join(index.root, dir, m[0]))) findings.push(finding('error', 'feature', indexFile, i + 1, `names ${m[0]}, which does not exist.`));
		});

		// Owns: and Reads: on every slice; Reads targets exist; every contract file has a reader; no path owned twice.
		const readers = new Map(contract.map((c) => [c, 0]));
		const owners = new Map();
		const claims = [];
		const excepts = new Map();
		/** A slice's `Except:` names what its globs deliberately leave to another slice. */
		const excepted = (slice, path) =>
			(excepts.get(slice) ?? []).some((e) => e === path || (isGlob(e) && !isGlob(path) && globRegex(e).test(path)));
		for (const s of slices) {
			const line = lineOf(index, s, /^\s*Except\s*:/);
			if (!line) continue;
			const { spans } = codeSpans(line.text);
			excepts.set(s, spans.length > 0 ? spans : line.text.replace(/^\s*Except\s*:/, '').split(',').map((p) => p.trim()).filter(Boolean));
		}
		for (const s of slices) {
			const owns = lineOf(index, s, /^\s*Owns\s*:/);
			const reads = lineOf(index, s, /^\s*Reads\s*:/);
			if (!owns) findings.push(finding('error', 'feature', s, 1, 'no "Owns:" line. Name the files this slice alone writes.'));
			else {
				const { spans } = codeSpans(owns.text);
				const paths = spans.length > 0 ? spans : owns.text.replace(/^\s*Owns\s*:/, '').split(',').map((p) => p.trim()).filter(Boolean);
				for (const p of paths) {
					if (owners.has(p) && owners.get(p) !== s)
						findings.push(finding('error', 'feature', s, owns.line, `${p} is also owned by ${owners.get(p)}. One owner per file; name an integration owner for a shared one.`));
					else owners.set(p, s);
					claims.push({ path: p, slice: s, line: owns.line });
				}
			}
			if (!reads) findings.push(finding('error', 'feature', s, 1, 'no "Reads:" line. Name the contract files this slice codes against.'));
			else {
				const targets = reads.text.replace(/^\s*Reads\s*:/, '').replace(/`/g, '').split(/[\s,]+/).filter((t) => t !== '');
				for (const t of targets) {
					const rel = joinRel(dir, t.replace(/#.*$/, ''));
					if (rel === null || !existsSync(join(index.root, rel)))
						findings.push(finding('error', 'feature', s, reads.line, `reads ${t}, which does not exist in ${dir}/.`));
					else if (readers.has(rel)) readers.set(rel, readers.get(rel) + 1);
				}
			}
			const lines = lineCount(index, s);
			if (lines > FEATURE_BUDGET.slice)
				findings.push(finding('error', 'feature', s, 1, `${lines} lines; a slice file stays under ${FEATURE_BUDGET.slice}. A slice this big was cut too coarsely: re-cut it in the contract.`));
		}
		for (let a = 0; a < claims.length; a += 1)
			for (let b = a + 1; b < claims.length; b += 1) {
				const x = claims[a];
				const y = claims[b];
				if (x.slice === y.slice || x.path === y.path || !ownershipOverlaps(x.path, y.path)) continue;
				if (excepted(x.slice, y.path) || excepted(y.slice, x.path)) continue;
				findings.push(
					finding(
						'warn',
						'feature',
						y.slice,
						y.line,
						`${y.path} overlaps ${x.path}, owned by ${x.slice}. If the split is deliberate, write it down: an "Except:" line in the slice whose glob is wider, naming the other slice's path.`
					)
				);
			}
		for (const [c, n] of readers) {
			if (n === 0) findings.push(finding('error', 'feature', c, 1, 'no slice reads this contract file. It is dead weight, or a slice forgot it in "Reads:".'));
			const lines = lineCount(index, c);
			if (lines > FEATURE_BUDGET.contract)
				findings.push(finding('error', 'feature', c, 1, `${lines} lines; a contract file stays under ${FEATURE_BUDGET.contract}. Split it by topic so slices load only what they consume.`));
		}
	}
	stats.feature = summary;
}

function slugify(text) {
	return text
		.toLowerCase()
		.replace(/`/g, '')
		.replace(/[^a-z0-9]+/g, '-')
		.replace(/^-+|-+$/g, '')
		.slice(0, 40)
		.replace(/-+$/, '');
}

function trimBlank(lines) {
	let a = 0;
	let b = lines.length;
	while (a < b && lines[a].trim() === '') a += 1;
	while (b > a && lines[b - 1].trim() === '') b -= 1;
	return lines.slice(a, b);
}

function splitBy(parsed, level) {
	const marker = new RegExp(`^${'#'.repeat(level)}\\s+(.*?)\\s*$`);
	const parts = [{ title: null, lines: [] }];
	for (const l of parsed) {
		const h = l.fence === null && !l.marker ? l.text.match(marker) : null;
		if (h) parts.push({ title: h[1], lines: [] });
		else parts[parts.length - 1].lines.push(l);
	}
	return parts;
}

function tableRows(lines) {
	const rows = lines.filter((l) => /^\s*\|/.test(l.text)).map((l) => l.text.trim().replace(/^\||\|$/g, '').split('|').map((c) => c.trim()));
	if (rows.length < 2 || !rows[1].every((c) => /^:?-{3,}:?$/.test(c))) return null;
	return { header: rows[0], body: rows.slice(2) };
}

/**
 * Split a single-file `.ef/<feature>/checks.md` into the split layout, deterministically:
 * `## Contract` subsections become contract/<topic>.md, `## Checks` slices become slices/<id>-<slug>.md
 * carrying their ownership row, Swept and Coverage go to verification.md, history to log.md, and
 * everything else stays in checks.md with a slice table and a contract table. A contract heading
 * naming slices in parentheses — "Schema (S0)" — is read by those slices only; every other contract
 * file is read by every slice. Review the Reads: lines after splitting.
 */
export function splitChecklist(featureDir) {
	const dir = resolve(featureDir);
	const indexPath = join(dir, 'checks.md');
	if (!existsSync(indexPath)) throw new Error(`${indexPath} does not exist`);
	if (existsSync(join(dir, 'slices')) || existsSync(join(dir, 'contract'))) throw new Error(`${dir} is already split`);
	for (const name of ['checks.md.orig', 'verification.md', 'log.md'])
		if (existsSync(join(dir, name))) throw new Error(`${join(dir, name)} already exists; the split would overwrite it. Move it aside first.`);
	const before = readFileSync(indexPath, 'utf8');
	const sections = splitBy(parseMarkdown(before), 2);
	const text = (lines) => lines.map((l) => l.text);
	const title = (sections[0].lines.find((l) => /^#\s/.test(l.text))?.text ?? '# Checks').replace(/^#\s+/, '');

	const contractFiles = [];
	const slices = [];
	const verification = [];
	const log = [];
	const indexParts = [];
	let ownership = null;

	for (const section of sections.slice(1)) {
		const t = section.title.toLowerCase();
		if (t === 'contract') {
			const subs = splitBy(section.lines, 3);
			if (trimBlank(text(subs[0].lines)).length > 0)
				contractFiles.push({ heading: 'Contract: general', slug: 'general', readers: null, body: trimBlank(text(subs[0].lines)) });
			for (const sub of subs.slice(1)) {
				const paren = sub.title.match(/\(([^)]*)\)/);
				const ids = paren ? [...paren[1].matchAll(/\bS\d+[a-z]?\b/g)].map((m) => m[0]) : [];
				let slug = slugify(sub.title.replace(/\(.*$/, '')) || 'section';
				while (contractFiles.some((c) => c.slug === slug)) slug = `${slug}-2`;
				contractFiles.push({ heading: sub.title, slug, readers: ids.length > 0 ? ids : null, body: trimBlank(text(sub.lines)) });
			}
			indexParts.push({ kind: 'contract-table' });
		} else if (t === 'checks') {
			const subs = splitBy(section.lines, 3);
			const loose = trimBlank(text(subs[0].lines));
			for (const sub of subs.slice(1)) {
				const id = sub.title.match(/^(S\d+[a-z]?)\b\s*(?:[—–:-]\s*)?(.*)$/);
				if (id) slices.push({ id: id[1], heading: sub.title, outcome: id[2], body: trimBlank(text(sub.lines)) });
				else loose.push('', `### ${sub.title}`, ...trimBlank(text(sub.lines)));
			}
			indexParts.push({ kind: 'slice-table', loose });
		} else if (t === 'ownership') {
			ownership = { lines: section.lines };
			indexParts.push({ kind: 'ownership' });
		} else if (t === 'swept' || t === 'coverage') verification.push(`## ${section.title}`, ...section.lines.map((l) => l.text));
		else if (HISTORY_TITLE.test(t)) log.push(`## ${section.title}`, ...section.lines.map((l) => l.text));
		else indexParts.push({ kind: 'section', lines: [`## ${section.title}`, ...section.lines.map((l) => l.text)] });
	}

	// Ownership rows move into their slice files; rows naming no slice, and any notes, stay.
	const remaining = [];
	const movedRows = new Map();
	let ownershipTableKept = false;
	if (ownership) {
		const table = tableRows(ownership.lines);
		const filesCol = table ? Math.max(0, table.header.findIndex((h) => /file/i.test(h))) : -1;
		const waveCol = table ? table.header.findIndex((h) => /wave/i.test(h)) : -1;
		const kept = [];
		if (table) {
			for (const row of table.body) {
				const slice = slices.find((s) => new RegExp(`^${s.id}\\b`).test(row[0]));
				if (slice) {
					slice.owns = row[filesCol === 0 ? 1 : filesCol];
					if (waveCol !== -1) slice.wave = row[waveCol];
					movedRows.set(row.join('|'), slice.owns);
				} else kept.push(row);
			}
		}
		ownershipTableKept = kept.length > 0;
		const notes = trimBlank(ownership.lines.filter((l) => !/^\s*\|/.test(l.text)).map((l) => l.text));
		if (table && kept.length > 0)
			remaining.push(`| ${table.header.join(' | ')} |`, `| ${table.header.map(() => '---').join(' | ')} |`, ...kept.map((r) => `| ${r.join(' | ')} |`));
		if (!table) remaining.push(...trimBlank(ownership.lines.map((l) => l.text)));
		else if (notes.length > 0) remaining.push(...(remaining.length > 0 ? [''] : []), ...notes);
	}

	// Everything is built in memory first, then proven lossless, then written.
	const outputs = new Map();
	const put = (rel, lines) => outputs.set(rel, `${trimBlank(lines).join('\n')}\n`);

	for (const c of contractFiles) {
		c.file = `contract/${c.slug}.md`;
		put(c.file, [`# ${c.heading}`, '', ...c.body]);
	}
	for (const s of slices) {
		s.file = `slices/${s.id}-${slugify(s.outcome.replace(/·.*$/, '')) || 'slice'}.md`;
		const reads = contractFiles.filter((c) => c.readers === null || c.readers.includes(s.id)).map((c) => c.file);
		const ids = [...s.body.join('\n').matchAll(/^\s*\*\*C(\d+)\*\*/gm)].map((m) => Number(m[1]));
		s.checks = ids;
		put(s.file, [`# ${s.heading}`, '', ...(s.owns ? [`Owns: ${s.owns}`] : []), `Reads: ${reads.join(', ')}`, '', ...s.body]);
	}
	const span = (ids) => {
		if (ids.length === 0) return '—';
		const sorted = [...ids].sort((a, b) => a - b);
		const contiguous = sorted.every((v, i) => i === 0 || v === sorted[i - 1] + 1);
		return contiguous && sorted.length > 1 ? `C${sorted[0]}–C${sorted[sorted.length - 1]}` : sorted.map((v) => `C${v}`).join(', ');
	};
	const hasWave = slices.some((s) => s.wave !== undefined);

	const index = [...trimBlank(text(sections[0].lines)), ''];
	index.push(
		'Layout: split. A builder loads this file, the contract files its slice names under `Reads:`, and its own slice file. The auditor also loads `verification.md`. History is in `log.md`.',
		''
	);
	for (const part of indexParts) {
		if (part.kind === 'section') index.push(...trimBlank(part.lines), '');
		else if (part.kind === 'contract-table') {
			index.push('## Contract', '', '| File | Holds |', '| --- | --- |', ...contractFiles.map((c) => `| [${c.file}](${c.file}) | ${c.heading} |`), '');
		} else if (part.kind === 'slice-table') {
			index.push('## Slices', '');
			index.push(hasWave ? '| Slice | Outcome | Wave | File | Checks |' : '| Slice | Outcome | File | Checks |', hasWave ? '| --- | --- | --- | --- | --- |' : '| --- | --- | --- | --- |');
			for (const s of slices)
				index.push(hasWave ? `| ${s.id} | ${s.outcome} | ${s.wave ?? ''} | [${s.file}](${s.file}) | ${span(s.checks)} |` : `| ${s.id} | ${s.outcome} | [${s.file}](${s.file}) | ${span(s.checks)} |`);
			index.push('');
			if (part.loose.length > 0) index.push(...part.loose, '');
		} else if (part.kind === 'ownership' && remaining.length > 0) index.push('## Ownership', '', 'Per-slice ownership is the `Owns:` line of each slice file. Shared and lead-owned files:', '', ...remaining, '');
	}
	put('checks.md', index);
	if (verification.length > 0) put('verification.md', [`# Verification: ${title}`, '', ...verification]);
	if (log.length > 0) put('log.md', [`# Log: ${title}`, '', 'Append-only. Nothing the build reads lives here.', '', ...log]);

	const missing = droppedLines(before, outputs, movedRows, ownershipTableKept);
	if (missing.length > 0)
		throw new Error(
			`the split would drop ${missing.length} line${missing.length > 1 ? 's' : ''}, so nothing was written:\n${missing
				.slice(0, 10)
				.map((m) => `  checks.md:${m.line}  ${m.text}`)
				.join('\n')}`
		);

	writeFileSync(join(dir, 'checks.md.orig'), before);
	for (const [rel, content] of outputs) {
		mkdirSync(join(dir, rel, '..'), { recursive: true });
		writeFileSync(join(dir, rel), content);
	}

	const tokens = (rel) => Math.ceil(outputs.get(rel).length / 4);
	const indexTokens = tokens('checks.md');
	const perSlice = slices.map((s) => ({
		slice: s.id,
		tokens: indexTokens + tokens(s.file) + contractFiles.filter((c) => c.readers === null || c.readers.includes(s.id)).reduce((n, c) => n + tokens(c.file), 0)
	}));
	const notes = [];
	for (const s of slices) if (!s.owns) notes.push(`${s.file} has no "Owns:" line: ${s.id} was not in the ownership table.`);
	if (!/^##\s+requirements?\b/im.test(outputs.get('checks.md')))
		notes.push('checks.md has no "## Requirements" section: list the requirement ids this repo owns, then cite them on the check lines that prove them.');
	notes.push('Review every "Reads:" line: contract files without a slice id in their heading were given to every slice.');
	return { written: [...outputs.keys()], backup: 'checks.md.orig', before: Math.ceil(before.length / 4), perSlice, notes };
}

/** Table rows compare by cell content, separators by shape; every other line by its trimmed text. */
function normalizeLine(line) {
	const t = line.trim();
	if (!t.startsWith('|')) return t;
	return t
		.replace(/^\||\|$/g, '')
		.split('|')
		.map((c) => (/^:?-{3,}:?$/.test(c.trim()) ? '---' : c.trim()))
		.join('|');
}

/**
 * Every non-blank line of the original must survive somewhere in the output, counted with
 * multiplicity. The only lines allowed to change form: the `## Contract`/`## Checks`/`## Ownership`
 * headings (replaced by generated tables), a `###` heading promoted to its file's `#` title, and an
 * ownership row that became its slice's `Owns:` line.
 */
export function droppedLines(original, outputs, movedRows = new Map(), ownershipTableKept = false) {
	const have = new Map();
	for (const content of outputs.values())
		for (const l of splitLines(content)) {
			const n = normalizeLine(l);
			if (n !== '') have.set(n, (have.get(n) ?? 0) + 1);
		}
	const take = (n) => {
		const c = have.get(n) ?? 0;
		if (c === 0) return false;
		have.set(n, c - 1);
		return true;
	};
	const missing = [];
	let section = null;
	parseMarkdown(original).forEach((l, i) => {
		const n = normalizeLine(l.text);
		if (n === '') return;
		const outside = l.fence === null && !l.marker;
		const h2 = outside ? l.text.match(/^##\s+(.*?)\s*$/) : null;
		if (h2) {
			section = h2[1].toLowerCase();
			if (section === 'contract' || section === 'checks' || section === 'ownership') return;
		}
		const h3 = outside ? l.text.match(/^###\s+(.*?)\s*$/) : null;
		if (h3 && (section === 'contract' || section === 'checks') && take(`# ${h3[1]}`)) return;
		if (section === 'ownership' && outside && l.text.trim().startsWith('|')) {
			if (movedRows.has(n)) {
				if (take(normalizeLine(`Owns: ${movedRows.get(n)}`))) return;
			} else if (!ownershipTableKept && (n.split('|').every((c) => c === '---') || movedRows.size > 0)) return;
		}
		if (!take(n)) missing.push({ line: i + 1, text: l.text.trim().slice(0, 100) });
	});
	return missing;
}

// ---------------------------------------------------------------------------------------------
// Entry points

/**
 * Run every gate. `only`: report findings on these repo-relative files only (the edit hook).
 * Returns { version, root, findings, stats }.
 */
export function check({ root, only = null } = {}) {
	const absolute = resolve(root ?? process.cwd());
	textCache.clear();
	const index = indexRepo(absolute);
	const findings = [];
	const stats = {};
	const mdFiles = [...index.files].filter((f) => /\.md$/i.test(f)).sort();
	const scopes = findScopes(index).filter((s) => s.primary !== undefined);
	const rootScope = scopes.find((s) => s.root) ?? null;

	if (rootScope === null)
		findings.push(finding('error', 'rulebook', 'AGENTS.md', 1, 'no root rulebook. Write AGENTS.md at the repository root; run /ef:ready to bootstrap one.'));

	const rulebooks = new Set(scopes.flatMap((s) => scopeLoaded(index, s)));
	gateAnchors(index, mdFiles, rulebooks, findings, stats);
	const budget = gateBindings(index, rootScope, findings, stats);
	gateCommands(index, scopes, findings, stats);
	gateBudget(index, scopes, budget, findings, stats);
	gateRouting(index, scopes, findings, stats);
	gateChecks(index, scopes, findings, stats);
	gateSingleSource(index, scopes, findings, stats);
	gateFeatures(index, findings, stats);

	const wanted = only === null ? null : new Set(only.map((f) => f.replace(/\\/g, '/').replace(/^\.\//, '')));
	const kept = wanted === null ? findings : findings.filter((f) => wanted.has(f.file));
	kept.sort((a, b) => (a.level === b.level ? 0 : a.level === 'error' ? -1 : 1) || a.file.localeCompare(b.file) || a.line - b.line);
	return { version: VERSION, root: absolute, viaGit: index.viaGit, findings: kept, stats };
}

export function formatReport(result) {
	const { stats, findings } = result;
	const errors = findings.filter((f) => f.level === 'error');
	const warns = findings.filter((f) => f.level === 'warn');
	const count = (gate) => {
		const e = errors.filter((f) => f.gate === gate).length;
		const w = warns.filter((f) => f.gate === gate).length;
		return e + w === 0 ? 'ok' : [e ? `${e} error${e > 1 ? 's' : ''}` : '', w ? `${w} warning${w > 1 ? 's' : ''}` : ''].filter(Boolean).join(', ');
	};
	const rootBudget = stats.budget?.scopes.find((s) => s.root);
	const out = [`ef-check ${result.version} · ${result.root}${result.viaGit ? '' : ' (no git: filesystem walk)'}`, ''];
	out.push(
		`  anchors        ${stats.anchors.checked} cited paths checked, ${stats.anchors.allowed} allowed as gone, ${stats.anchors.historical} stale in records (warnings) · ${count('anchors')}`
	);
	out.push(`  commands       ${stats.commands.named} named, ${stats.commands.unverifiable} not verifiable · ${count('commands')}`);
	if (rootBudget)
		out.push(
			`  budget         root ${rootBudget.lines} lines (~${rootBudget.tokens} tokens), limit ${stats.budget.limits.rootWarn} warn / ${stats.budget.limits.rootFail} fail · ${count('budget')}`
		);
	else out.push(`  budget         no root rulebook · ${count('budget')}`);
	out.push(`  routing        ${stats.routing.scoped} scoped rulebooks, ${stats.routing.unrouted} unrouted · ${count('routing')}`);
	out.push(`  checks         ${stats.checks.invariants} invariants, ${stats.checks.checked} checked, ${stats.checks.gaps.length} honest gaps · ${count('checks')}`);
	out.push(`  single-source  ${stats.singleSource.pointers} pointers · ${count('single-source')}`);
	out.push(`  feature        ${stats.feature.features} checklists, ${stats.feature.checks} checks, ${stats.feature.slices} slice files · ${count('feature')}`);
	out.push(`  bindings       ${stats.bindings.present ? `${stats.bindings.gates} gates` : 'missing'} · ${count('bindings')}`);
	if (findings.some((f) => f.gate === 'rulebook')) out.push(`  rulebook       ${count('rulebook')}`);
	for (const [title, list] of [
		['errors', errors],
		['warnings', warns]
	]) {
		if (list.length === 0) continue;
		out.push('', `${title} (${list.length})`);
		for (const f of list) out.push(`  ${f.file}:${f.line}  [${f.gate}] ${f.message}`);
	}
	if (stats.checks.gaps.length > 0) {
		out.push('', `honest gaps (${stats.checks.gaps.length}): candidates for a level 0 check`);
		for (const g of stats.checks.gaps) out.push(`  ${g.file}:${g.line}  ${g.summary}`);
	}
	out.push('', errors.length === 0 ? 'PASS' : `FAIL: ${errors.length} error${errors.length > 1 ? 's' : ''}`);
	return out.join('\n');
}

function main(argv) {
	const args = { root: process.cwd(), json: false, only: null };
	for (let i = 0; i < argv.length; i += 1) {
		const arg = argv[i];
		if (arg === '--version') {
			process.stdout.write(`${VERSION}\n`);
			return 0;
		} else if (arg === '--json') args.json = true;
		else if (arg === '--root') args.root = argv[(i += 1)];
		else if (arg === '--only') {
			// One path per flag, repeatable: a file name may itself contain a comma.
			const path = argv[(i += 1)];
			if (path === undefined || path === '') {
				process.stderr.write('ef-check: --only needs a file\n');
				return 2;
			}
			args.only = [...(args.only ?? []), path];
		}
		else if (arg === '--split') args.split = argv[(i += 1)];
		else if (arg === '--help' || arg === '-h') {
			process.stdout.write('usage: ef-check [--root <dir>] [--json] [--only <file>]... [--split <.ef/feature>] [--version]\n');
			return 0;
		} else {
			process.stderr.write(`ef-check: unknown argument ${arg}\n`);
			return 2;
		}
	}
	if (args.root === undefined) {
		process.stderr.write('ef-check: --root needs a directory\n');
		return 2;
	}
	if (args.split !== undefined) {
		let out;
		try {
			out = splitChecklist(resolve(args.root, args.split));
		} catch (error) {
			// A refusal is an answer, not a crash: say why, exit "could not run".
			process.stderr.write(`ef-check: ${error instanceof Error ? error.message : String(error)}\n`);
			return 2;
		}
		process.stdout.write(
			[
				`split ${args.split}: ${out.written.length} files (${out.written.join(', ')})`,
				`original kept as ${args.split}/${out.backup}; every line of it was found in the output before anything was written`,
				`before: every reader loaded ~${out.before} tokens`,
				...out.perSlice.map((p) => `  builder ${p.slice}: ~${p.tokens} tokens`),
				...out.notes.map((n) => `note: ${n}`),
				'Then run ef-check without --split.'
			].join('\n') + '\n'
		);
		return 0;
	}
	const result = check({ root: args.root, only: args.only });
	process.stdout.write(`${args.json ? JSON.stringify(result, null, 2) : formatReport(result)}\n`);
	return result.findings.some((f) => f.level === 'error') ? 1 : 0;
}

const invokedDirectly = (() => {
	try {
		return process.argv[1] !== undefined && realpathSync(process.argv[1]) === realpathSync(fileURLToPath(import.meta.url));
	} catch {
		return false;
	}
})();

if (invokedDirectly) {
	try {
		process.exitCode = main(process.argv.slice(2));
	} catch (error) {
		process.stderr.write(`ef-check: ${error instanceof Error ? error.stack : String(error)}\n`);
		process.exitCode = 2;
	}
}
