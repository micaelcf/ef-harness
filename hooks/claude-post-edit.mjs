// Claude Code PostToolUse hook (hooks/hooks.json): Edit, Write and MultiEdit on a markdown file.
// Errors come back as a blocking reason Claude must act on; warnings as added context.

import { rulebookFeedback } from './rulebook-gate.mjs';

async function readStdin() {
	const chunks = [];
	for await (const chunk of process.stdin) chunks.push(chunk);
	return Buffer.concat(chunks).toString('utf8');
}

try {
	const input = JSON.parse((await readStdin()) || '{}');
	const cwd = process.env.CLAUDE_PROJECT_DIR || input.cwd || process.cwd();
	const path = input.tool_input?.file_path ?? input.tool_input?.path;
	const feedback = await rulebookFeedback(cwd, [path]);
	if (feedback !== null) {
		const output =
			feedback.errors > 0
				? { decision: 'block', reason: feedback.text }
				: { hookSpecificOutput: { hookEventName: 'PostToolUse', additionalContext: feedback.text } };
		process.stdout.write(`${JSON.stringify(output)}\n`);
	}
} catch (error) {
	process.stderr.write(`ef rulebook hook: ${error instanceof Error ? error.message : String(error)}\n`);
	process.exitCode = 1;
}
