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
2. Drop `assets/toe/TouchDesignerAPI.tox` from the installed skill into the project.
3. Run the skill in your agent with a prompt such as:

```text
Use $touchdesigner to create a Grid SOP with animated noise and check errors.
```

The bundled command talks to the local TouchDesigner bridge:

```bash
node scripts/client.mjs ping
node scripts/client.mjs pane
node scripts/client.mjs operators /project1
```

`execute` reads Python from stdin and writes input diagnostics to stderr. Stdout remains the TouchDesigner JSON response.

Set `TDAPI_PORT` when the TOX Port parameter is not `44444`.

## Structure

- `skills/touchdesigner/SKILL.md`: portable skill entry point.
- `skills/touchdesigner/scripts/client.mjs`: dependency-free local HTTP command.
- `skills/touchdesigner/references/`: task-specific TouchDesigner guidance.
- `skills/touchdesigner/assets/toe/`: TouchDesigner bridge component.
- `skills/touchdesigner/assets/td-api/`: bridge source files.
