---
description: Turn a feature into a small, product-level Jira issue set - draft first, push through the host's Jira tools only after explicit approval
argument-hint: "<feature: text, a doc path, or nothing for the current context> [PROJECT-KEY] [language]"
---

Feature, and any project key or language stated with it: $ARGUMENTS

If that is empty, use the feature under discussion in this conversation.

Optional · standalone, outside the five stages · needs no EF docs

Load the `ef-to-jira` skill — it holds the questions, the sizing rules, the issue shape and the push
protocol.

## Non-negotiables

- **Draft first.** Write `.ef/<feature>/jira.md` — the feature's only Jira record — show it, and push
  only on an explicit approval of that set. The user may strike items before pushing.
- **Project and language are explicit.** Ask for whichever is missing; the language may come from the
  repo's `jira-language:` binding. Never infer the project.
- **Product only.** User stories, acceptance criteria, business rules — no implementation detail.
- **Team patterns and custom fields are opt-in.** Ask; when declined, touch neither — except fields
  the project requires to create an issue, which are always filled or asked about, never invented.
- **No Jira tools in this session → draft only.** Never fall back to the REST API.
