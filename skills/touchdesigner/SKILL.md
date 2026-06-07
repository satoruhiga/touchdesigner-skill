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

If the command cannot connect, tell the user to load the TOX or align `TDAPI_PORT` with the TOX Port parameter before continuing.

## Workflow

1. Read only the relevant extra reference:
   - `references/operator-families.md` for SOP/POP/TOP/CHOP/DAT/COMP conversion.
   - `references/geometry-comp.md` for Geometry COMP and instancing.
   - `references/rendering.md` for Camera, Light, Render TOP, and output.
   - `references/glsl.md` for GLSL TOP, MAT, POP, and shader work.
   - `references/operator-tips.md` for feedback loops and simulations.
2. Inspect the current TD state with `pane`, `selection`, or `operators`.
3. Execute small Python changes through `scripts/client.mjs execute`.
4. Verify parameter names with `op.TDAPI.GetParameterList()` before setting parameters.
5. Check errors in a separate call after complex changes because TD error state updates on frame boundaries.

## Local Client

Use the client relative to the skill root:

```bash
node scripts/client.mjs pane
node scripts/client.mjs selection
node scripts/client.mjs operators /project1
node scripts/client.mjs params sphereSOP
```

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
- Use relative paths for nearby operator references.
- Create source geometry at the parent level before feeding Geometry COMP.

## Bridge Assets

- `assets/toe/TouchDesignerAPI.tox`: drop-in TouchDesigner component.
- `assets/toe/develop.toe`: development TouchDesigner project for the bridge.
- `assets/toe/src/TouchDesignerAPI.py`: source for the TD HTTP extension.
- `assets/toe/src/td_utils.py`: helper functions bound to `op.TDAPI`.
