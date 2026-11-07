---
name: touchdesigner
description: Create, inspect, modify, and debug TouchDesigner networks through a local TouchDesigner HTTP bridge and bundled reference guidance. Use when the user asks to work with TouchDesigner, TD operators, SOP/POP/TOP/CHOP/DAT/COMP networks, GLSL in TD, rendering setup, operator parameters, network layout, or AI-assisted TD project changes.
license: MIT
allowed-tools: Bash(node:*)
---

# TouchDesigner

Use this skill to work directly in a running TouchDesigner project. The bundled TOX exposes a local HTTP bridge inside TouchDesigner; the bundled Node script calls that bridge without requiring MCP installation.

## Mandatory First Step

Immediately after loading this skill, read `references/basics.md` once per session before doing TouchDesigner work, including asking setup questions, running connectivity checks, or making project changes. If it has already been read in the current session, do not read it again; follow the remembered rules. Treat it as required operating procedure; do not run mutating `execute` calls until it has been read in the current session.

## Setup

1. Ensure TouchDesigner 2025 or later is open.
2. Ensure Node.js 18 or later is available for `scripts/client.mjs`.
3. Load `assets/toe/TouchDesignerAPI.tox` into the project if `op.TDAPI` is not already present.
4. Use `TDAPI_PORT` when the TOX Port parameter is not `44444`.
5. Verify connectivity before changing the project:

```bash
node scripts/client.mjs ping
```

After ping, run `audit` on the intended target to check audit capability and establish the baseline. A successful ping alone does not mean the installed bridge supports audit. If `/audit` returns 404 Not Found (rather than Operator not found), the bridge may be older than the client. Explain that it needs the updated bundled TOX; preserve project-specific bridge settings and obtain authorization before replacing a bridge unless its upgrade is already in scope. Do not silently replace it or treat a failed audit as clean.

If the command cannot connect, tell the user to load the TOX or align `TDAPI_PORT` with the TOX Port parameter before continuing.

## Editable Network Design

Before creating, editing, or restructuring networks, read once per session `references/network-design.md`. Preserve existing sample behavior when copying. Choose standard operators first, Script DAT/CHOP preprocessing when clearer, then lightweight Expression processing; long parameter expressions are a last resort. Keep user-editable controls visible and reuse suitable prepared data.

Audit the target before editing, after a meaningful change, before replication, and before completion with `node scripts/client.mjs audit OP_PATH`. Use `--baseline FILE` to distinguish new findings. Review new warnings before continuing; do not automatically rewrite existing ones. The default warning boundary is 71 characters. Validate an actual editing operation as well as output correctness.

## Workflow

1. Read only the relevant extra reference:
   - `references/operator-families.md` for SOP/POP/TOP/CHOP/DAT/COMP conversion.
   - `references/geometry-comp.md` for Geometry COMP and instancing.
   - `references/rendering.md` for Camera, Light, Render TOP, and output.
   - `references/glsl.md` for GLSL TOP, MAT, POP, and shader work.
   - `references/operator-tips.md` for feedback loops and simulations.
2. Inspect the current TD state with `pane`, `selection`, `operators`, `params`, `inspect`, or `network`.
3. Execute small Python changes through `scripts/client.mjs execute`.
4. Verify parameter names with `scripts/client.mjs params` before setting parameters.
5. Check errors in a separate call after complex changes because TD error state updates on frame boundaries.

## Local Client

Use the client relative to the skill root:

```bash
node scripts/client.mjs pane
node scripts/client.mjs selection
node scripts/client.mjs operators /project1
node scripts/client.mjs params sphereSOP --match "rad*"
node scripts/client.mjs params /project1/base1/sphere1 --changed
node scripts/client.mjs inspect /project1/base1/sphere1
node scripts/client.mjs network /project1 --depth 1
node scripts/client.mjs audit /project1/example
```

Use Runtime Inquiry commands before writing ad hoc Python:

- `params OP_TYPE`: show parameter reference from TouchDesigner's offline help.
- `params OP_PATH`: show live parameter state for an operator.
- `params ... --match "t* r* ^help*"`: filter parameter names with wildcard patterns and `^` exclusions.
- `params OP_PATH --changed`: show only changed, expression, export, or bind parameters.
- `params TARGET --full`: include extra metadata such as menu names and ranges.
- `inspect OP_PATH`: show compact live state for one operator, including changed parameters, connections, docked operators, and errors.
- `network OP_PATH --depth N`: show a scoped directed graph with flat `nodes` and `edges`; node `id`/`path` and edge endpoints are absolute paths, while node `pathFromRoot` is a relative path hint for internal operators that move together. Choose shared-resource and external-input references by their role, not proximity.

Pipe Python through stdin to avoid shell quoting problems:

```bash
node scripts/client.mjs execute --from /project1/base1 <<'PY'
base = me
grid = op.TDAPI.CreateOp(base, gridSOP, 'grid1', x=0, y=0)
noise = op.TDAPI.CreateOp(base, noiseSOP, 'noise1', x=200, y=0)
null = op.TDAPI.CreateOp(base, nullSOP, 'null1', x=400, y=0)
op.TDAPI.ChainOperators([grid, noise, null])
PY
```

For PowerShell:

```powershell
@'
print(me.path)
'@ | node scripts/client.mjs execute --from /
```

`execute` writes input diagnostics to stderr by default (`bytes`, `chars`, `lines`, `sha256`, and `from`). Stdout remains the TouchDesigner JSON response. Use `--quiet` only when stderr must be silent.

## Required TD Patterns

Always use `op.TDAPI` helpers instead of raw TD API when available:

```python
new_op = op.TDAPI.CreateOp(base, gridSOP, 'grid1', x=0, y=0)
chain = op.TDAPI.ChainOperators([grid, noise, null])
params = op.TDAPI.GetParameterList('sphereSOP')
errors = op.TDAPI.CheckErrors(op('/project1/base1'), recurse=True)
```

Apply these rules:

- Set `viewer = True` for created operators; `CreateOp` already does this.
- Use Null operators as stable reference endpoints.
- Verify parameter names before assignment.
- Lay out operators intentionally and avoid overlap.
- Use relative paths inside components that move together, absolute paths for fixed shared resources, and explicit input parameters for interchangeable external components. Avoid deep parent traversal and Python construction of fixed paths.
- Create source geometry at the parent level before feeding Geometry COMP.

## Personal Knowledge Base

Use a user-owned local Personal Knowledge Base only when it already exists or the user explicitly asks to initialize or record knowledge.

- Default location: `~/.touchdesigner-skill/knowledge/`
- Override location: `TD_SKILL_KB_DIR`
- Inspect the resolved path with `node scripts/client.mjs kb path`.
- Initialize it only on explicit request with `node scripts/client.mjs kb init`.
- Read from it only when it exists and is relevant to the task; do not treat it as mandatory startup context.
- Do not create it unless the user explicitly asks.
- Do not accumulate raw execution logs or script error records by default.
- Store only knowledge that can be reused across TouchDesigner projects. Do not store project-specific facts, project paths, client names, secrets, or one-off network details.
- If project-specific work reveals a reusable pattern, abstract it into a general lesson before saving.
- When a task reveals a reusable lesson worth keeping, suggest recording a Knowledge Note and ask before writing unless the user explicitly asked to record it.
- When writing, use curated Markdown knowledge notes for reusable lessons, such as common TD pitfalls or issues that required reference, introspection, docstring, or web research to solve.
- Update existing relevant knowledge pages before creating new pages; avoid numbered sections.
- Never write learned knowledge back into `SKILL.md` or bundled `references/`.

## Bridge Assets

- `assets/toe/TouchDesignerAPI.tox`: drop-in TouchDesigner component.
- `assets/toe/develop.toe`: development TouchDesigner project for the bridge.
- `assets/toe/src/TouchDesignerAPI.py`: source for the TD HTTP extension.
- `assets/toe/src/td_utils.py`: helper functions bound to `op.TDAPI`.
