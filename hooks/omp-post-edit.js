// omp extension (package.json#omp.extensions): after `edit` or `write` lands on a markdown file,
// return the vendored checker's findings as additional context for the next model request.

import { rulebookFeedback } from './rulebook-gate.mjs';

const EDIT_TOOLS = new Set(['edit', 'write']);

export default function efRulebookGate(pi) {
	pi.on('tool_result', async (event, ctx) => {
		if (event.isError) return;
		if (!EDIT_TOOLS.has(String(event.toolName ?? '').toLowerCase())) return;
		const input = event.input ?? {};
		const paths = [input.path, input.file_path, ...(Array.isArray(input.paths) ? input.paths : [])];
		try {
			const feedback = await rulebookFeedback(ctx?.cwd ?? process.cwd(), paths);
			if (feedback !== null) return { additionalContext: feedback.text };
		} catch (error) {
			return { additionalContext: `ef rulebook hook failed: ${error instanceof Error ? error.message : String(error)}` };
		}
	});
}
