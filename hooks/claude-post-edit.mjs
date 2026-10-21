// Claude Code PostToolUse hook (hooks/hooks.json): Edit, Write and MultiEdit on a markdown file.
// Errors come back as a blocking reason Claude must act on; warnings, and a checker that could not
// run, as added context. It always exits 0, so nothing it says is lost to a non-blocking error.

import { rulebookFeedback } from './rulebook-gate.mjs';

async function readStdin() {
	const chunks = [];
	for await (const chunk of process.stdin) chunks.push(chunk);
	return Buffer.concat(chunks).toString('utf8');
}

const context = (text) => ({ hookSpecificOutput: { hookEventName: 'PostToolUse', additionalContext: text } });

let output = null;
try {
	const input = JSON.parse((await readStdin()) || '{}');
	const cwd = process.env.CLAUDE_PROJECT_DIR || input.cwd || process.cwd();
	const path = input.tool_input?.file_path ?? input.tool_input?.path;
	const feedback = await rulebookFeedback(cwd, [path]);
	if (feedback !== null) output = feedback.errors > 0 ? { decision: 'block', reason: feedback.text } : context(feedback.text);
} catch (error) {
	output = context(`ef rulebook hook failed: ${error instanceof Error ? error.message : String(error)}`);
}
if (output !== null) process.stdout.write(`${JSON.stringify(output)}\n`);
