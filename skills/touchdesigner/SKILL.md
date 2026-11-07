---
name: touchdesigner
description: Create, inspect, modify, and debug TouchDesigner networks through a local TouchDesigner HTTP bridge and bundled reference guidance. Use when the user asks to work with TouchDesigner, TD operators, SOP/POP/TOP/CHOP/DAT/COMP networks, GLSL in TD, rendering setup, operator parameters, network layout, or AI-assisted TD project changes.
license: MIT
allowed-tools: Bash(node:*)
---

# TouchDesigner

Use this skill to work directly in a running TouchDesigner project. The bundled TOX exposes a local HTTP bridge inside TouchDesigner; the bundled Node script calls that bridge without requiring MCP installation.

## Choose the task scope

- **Explanation or planning without live state:** answer from the relevant reference; do not require TD connection, a baseline audit, or a bridge upgrade.
- **Live read-only inquiry:** connect and use the scoped inquiry commands below. Audit only when the user asks for an audit; do not modify the network or replace an old bridge just to answer an unrelated query.
- **Network creation or editing:** read [operating basics](references/basics.md) and [network design](references/network-design.md) once per session before mutation, then follow the editing workflow. Preserve existing behavior when copying samples.

## Live connection

Use TouchDesigner 2025 or later and Node.js 18 or later. The bundled `assets/toe/TouchDesignerAPI.tox` provides the bridge. Use `TDAPI_PORT` when its Port is not `44444`.

```bash
node scripts/client.mjs ping
```

If connection fails, explain how to load the TOX or align the port. Do not silently install or replace a project component. For an authorized bridge upgrade, preserve its project-specific settings.

Before an audit-dependent edit, run `audit` on the intended existing target (or the containing COMP for a new component). This establishes the baseline and checks audit capability. A successful ping alone does not mean an older bridge supports audit. A `/audit` 404 Not Found, distinct from Operator not found, requires the updated bundled TOX. Explain the required upgrade and obtain authorization unless it is already in scope; do not treat a failed audit as clean. Unaffected read-only inquiries can continue.

## Editing workflow

1. Inspect the target with `params`, `inspect` or `network`. Confirm parameter names and current state before assignment; record the scoped audit baseline.
2. Read task-specific guidance only as needed:
   - [Operator operations](references/operator-operations.md): creating, connecting, positioning, helper signatures or wildcard syntax.
   - [Operator families](references/operator-families.md): data-family conversions and runtime operator discovery.
   - [Geometry COMP](references/geometry-comp.md): geometry setup and instancing.
   - [Rendering](references/rendering.md): camera, lights, materials and rendering.
   - [GLSL](references/glsl.md): shader work.
   - [Operator tips](references/operator-tips.md): feedback and simulation patterns.
   - [Saving data](references/saving-data.md): exporting operator data.
3. Make small scoped changes through `execute`. Prefer standard operators, then Script DAT/CHOP preprocessing when clearer, then lightweight Expression processing. Long parameter expressions are a last resort. Keep editable controls visible and reuse suitable prepared data.
4. Audit after a meaningful unit of work, before replication, and before completion. Use `--baseline FILE` to distinguish new findings. Resolve new warnings or explain why they are necessary before proceeding; do not automatically repair unrelated existing warnings. The length warning starts at 71 characters.
5. Check errors in a separate call after changes. Verify output and a relevant editing operation, restore temporary test settings, and confirm the requested final state. A clean audit alone is not completion.

Use the TDAPI helpers when available. `CreateOp` enables the viewer and handles docked DAT placement; `MoveOp` moves docked operators with their owner. For new Geometry COMPs, the preferred pattern prepares shapes at the parent level; existing samples are preserved unless restructuring is requested. Component boundaries and path-selection rules are defined in [network design](references/network-design.md).

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

## Bridge Assets

- `assets/toe/TouchDesignerAPI.tox`: drop-in TouchDesigner component.
- `assets/toe/develop.toe`: development TouchDesigner project for the bridge.
- `assets/toe/src/TouchDesignerAPI.py`: source for the TD HTTP extension.
- `assets/toe/src/td_utils.py`: helper functions bound to `op.TDAPI`.
- For audit rule or bridge implementation changes, read [audit development](references/audit-development.md).
