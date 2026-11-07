# Editable networks and design audits

Read once per session before creating, editing, or restructuring a network. A correct output is only part of completion: a person must be able to inspect intermediate data and change the intended controls with ordinary TD operations.

## Choose a representation

Prefer standard operators, then Script DAT/CHOP preprocessing when nodes would obscure the transformation, then lightweight Expression operators. Long expressions in parameter fields are the last resort, requiring a concrete reason. Simple channel or parameter references do not need to become scripts.

- Keep selection, preprocessing and presentation understandable. Choosing another tracked object should remain a visible control, not a search through a script.
- Reuse existing corrected data if its units, coordinate space and meaning match. Do not rebuild conversion or aspect correction for every consumer.
- Script DAT/CHOP can prepare a clear table or channel output. Moving a long expression into a script without restoring editable controls is not an improvement.
- When copying an existing sample, preserve its behavior. Do not add clamps, fallback values or other unsolicited changes that alter the original result.
- Use Nulls at stable public outputs or useful reference boundaries, not mechanically before every reference.

## Component boundaries and paths

Use local relative references for operators that belong together and move together. Fixed project-wide resources can use explicit absolute paths. For an interchangeable external component, expose an OP parameter and consume its documented output such as `out1`; do not scatter assumptions about its internals across consumers.

Use constant paths or supported wildcard parameters when sufficient. Do not build lists of fixed OP paths in Python. Deep parent traversal hides assumptions about placement; shortening `parent().parent()` to `parent(2)` does not remove that dependency.

Before completion, try a relevant edit: change the selected object, exchange an input, or branch the prepared data into another reaction. Restore any temporary test input or setting and verify the requested final state. Avoid speculative configurability that the task does not need.

## Read-only audit

```powershell
node scripts/client.mjs audit /project1/example > baseline.json
node scripts/client.mjs audit /project1/example --baseline baseline.json
```

Run on the target COMP before editing, after a meaningful unit of work, before copying that unit elsewhere, and before completion. Do not audit after every node. Compare the same root and threshold; baseline findings are marked `existing` or `new`, and absent findings appear under `comparison.resolved` only when both scans are complete. Otherwise absent findings appear under `comparison.unverified`; unmatched current findings are also `unverified` when the baseline is incomplete.

Resolve newly introduced warnings or explain why they are necessary before proceeding. Do not repair unrelated pre-existing findings without authorization. A clean audit does not establish good design or functional correctness.

The initial rules are:

| ID | Detection | Expected problem |
|---|---|---|
| `expression-length` | Parameter expression exceeds 70 characters, including whitespace | Hidden processing and difficult edits |
| `deep-parent` | Literal `parent(3)` or greater | Dependence on outer placement |
| `chained-parent` | Consecutive parent calls | Hidden hierarchy dependence |

`--max-expression-length N` overrides the length limit. Short expressions still need to follow the design principles. Hierarchy rules also inspect Python text DATs. Comments and string literals are ignored. Computed parent depths and dynamically generated code are not resolved; this is a static inspection, not a proof that no hierarchy dependency exists.

All nonempty parameter expressions in Expression mode are inspected, including disabled fields and defaults. Inactive stored expressions and bind expressions are not included. Python DATs are selected by their `language` parameter; external Python modules and non-Python DATs are not scanned. Findings include enabled/default metadata and whether the expression or DAT text matches a clone source when it can be resolved without evaluating user expressions (constant clone paths, literal `op('path')`, or `op.Shortcut.op('path')`). Other clone expressions have unknown provenance. Dynamic DAT language settings are not evaluated and are reported as incomplete coverage. A clone match is context, not an automatic exemption or proof that it is a standard component.

The response contains `path`, `maxExpressionLength`, counts, `complete`, `errors`, and `findings`. Each finding includes stable `id`, `rule`, `severity`, location, snippet, `expectedProblem`, and `suggestion`. Parsing or collection failures make `complete` false; the CLI exits with code 2. Findings alone do not produce a failure exit code. Audit never rewrites code or parameters.

## Bridge development

Only when extending audit rules or packaging the bridge, read [audit development](audit-development.md).
