# Bootstrap interview: what the code can't tell you

Commands, layout and conventions can be derived from the code. Derive them; never ask the user for
what a file can answer. What follows can't be derived. It lives in people's heads, and it's the
part of a rulebook that actually changes what the agent gets right.

Run it under the `ef-grilling` skill's protocol: **one question at a time**, each grounded in
something you read, with a recommendation where the code suggests one. Record each answer as the
rulebook line it becomes. An answer of "I don't know" is recorded as an open question, not
filled in.

## The questions, in this order

1. **"What is the one rule this project would be broken without?"** This becomes the principle
   line. If the user lists several, ask which one the others serve.
2. **"What has an agent, or a new hire, gotten wrong here more than once?"** Every answer is a
   candidate invariant. For each one, ask: *"What fails today when someone does it?"* An answer that
   names a test, a lint rule or a type becomes `Check:`. "Nothing" becomes `Check: none —` with
   the reason, and goes on the list of level 0 checks to build.
3. **"Which failures compile, pass every test, and break later or somewhere else?"** These are the
   silent traps. They stay at level 1 whatever their scope, because nothing else will warn the
   agent in time.
4. **"Which of these commands is the gate, and which ones are fast but can't be trusted to
   conclude?"** Show the commands you derived. A fast type checker that skips some file types and
   a unit suite that skips the database are the usual pair.
5. **"What has been decided that an agent might propose undoing?"** Ask for the decision and where
   it's recorded. Point to the ADR; don't restate its reasoning.
6. **"What code has no caller yet but must not be deleted?"** Code that's merely early looks
   exactly like dead code to an agent tidying up.
7. **"Which directories have rules of their own?"** Each one becomes a scoped rulebook, and its
   routing line goes in the root. Only create one where there are rules to put in it.

Stop when the answers stop producing lines. Seven questions is the most, not the least. A small
repository may produce a rulebook of thirty lines, and that's a good result.

## What not to ask

- anything a manifest, task runner, CI workflow or the directory tree answers
- style preferences a formatter or linter already enforces
- "anything else?": it produces filler. The seven questions are the whole list.
