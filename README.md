# touchdesigner-skill

Portable Agent Skill for AI-assisted TouchDesigner work.

## Install

```bash
gh skill install satoruhiga/touchdesigner-skill touchdesigner --agent codex --scope user
```

For other agents, change `--agent`:

```bash
gh skill install satoruhiga/touchdesigner-skill touchdesigner --agent claude-code --scope user
gh skill install satoruhiga/touchdesigner-skill touchdesigner --agent cursor --scope user
```

Exact-path install also works:

```bash
gh skill install satoruhiga/touchdesigner-skill skills/touchdesigner --agent codex --scope user
```

## Local Preview

```bash
gh skill preview satoruhiga/touchdesigner-skill touchdesigner
```

## Use

1. Open TouchDesigner 2025 or later.
2. Ensure Node.js 18 or later is available for `scripts/client.mjs`.
3. Drop `assets/toe/TouchDesignerAPI.tox` from the installed skill into the project.
4. Run the skill in your agent with a prompt such as:

```text
Use the TouchDesigner skill to create a Grid SOP with animated noise and check errors.
```

The bundled command talks to the local TouchDesigner bridge:

```bash
node scripts/client.mjs ping
node scripts/client.mjs pane
node scripts/client.mjs operators /project1
node scripts/client.mjs params glslTOP --match "vec* pixeldat"
node scripts/client.mjs inspect /project1/test/glsl1
```

`execute` reads Python from stdin and writes input diagnostics to stderr. Stdout remains the TouchDesigner JSON response.

Set `TDAPI_PORT` when the TOX Port parameter is not `44444`.

## Testing Feature

The skill can maintain an optional personal TouchDesigner knowledge base for reusable lessons and preferences. It is local user-owned state, separate from the installed skill, and agents should initialize or write it only when explicitly asked.

## Structure

- `skills/touchdesigner/SKILL.md`: portable skill entry point.
- `skills/touchdesigner/scripts/client.mjs`: dependency-free local HTTP command.
- `skills/touchdesigner/references/`: task-specific TouchDesigner guidance.
- `skills/touchdesigner/assets/toe/`: TouchDesigner bridge project, component, and source files.
