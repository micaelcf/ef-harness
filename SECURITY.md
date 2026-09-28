# Security policy

## Supported versions

Only the latest release on `main` is supported. Fixes are not backported.

## What this plugin does and does not do

The harness is Markdown only: commands and skills that instruct an agent. It ships no executables,
hooks, MCP servers or network calls of its own. Whatever an agent does while following it runs with
the permissions of the tool you run it in (Claude Code or omp) and is subject to that tool's
approval settings.

Relevant reports include, for example:

- an instruction that leads an agent to exfiltrate data, disable safeguards, or run destructive
  commands without the user's approval
- content that enables prompt injection from untrusted repository files into privileged actions
- a manifest or catalog change that would make the plugin load code or content from an unexpected
  source

## Reporting a vulnerability

Please **do not open a public issue.** Report privately through GitHub:
**Security → Report a vulnerability** on
[github.com/micaelcf/ef-harness](https://github.com/micaelcf/ef-harness/security/advisories/new).

Include the affected file, the tool and version you ran it in, and the steps or prompt that
reproduce the behaviour.

You can expect an acknowledgement within 7 days. Once a fix is released, the advisory is published
with credit to the reporter unless you ask otherwise.
