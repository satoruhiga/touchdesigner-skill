# touchdesigner-skill

Portable Agent Skill for AI-assisted TouchDesigner work.

## Install

With GitHub CLI skill support:

```bash
gh skill install satoruhiga/touchdesigner-skill touchdesigner
```

With the skills.sh CLI:

```bash
npx skills add satoruhiga/touchdesigner-skill --skill touchdesigner
```

## Use

1. Open TouchDesigner 2025 or later.
2. Ensure Node.js 18 or later is available for `scripts/client.mjs`.
3. Drop `assets/toe/TouchDesignerAPI.tox` from the installed skill into the project.
4. Run the skill in your agent with a prompt such as:

```text
Use the TouchDesigner skill to create a Grid SOP with animated noise and check errors.
```

Set `TDAPI_PORT` if the TOX Port parameter is not `44444`.

## Structure

- `skills/touchdesigner/SKILL.md`: portable skill entry point.
- `skills/touchdesigner/references/`: task-specific TouchDesigner guidance.
- `skills/touchdesigner/assets/toe/`: TouchDesigner bridge project, component, and source files.
