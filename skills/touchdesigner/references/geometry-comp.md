# Geometry COMP Reference

## Contents

1. [Geometry COMP Pattern](#geometry-comp-pattern-sop-and-pop)
2. [Setup Pattern](#setup-pattern-full-example)
3. [Design Conditions](#design-conditions)
4. [Default New-Network Pattern](#default-new-network-pattern)
5. [Instancing](#instancing)

---

## Geometry COMP Pattern (SOP and POP)

For a new Geometry COMP using external source geometry, use `CreateGeometryComp`; it handles default torus removal and In/Out setup automatically. When copying or editing an existing sample, preserve its structure and behavior unless restructuring is requested:

```python
# SOP version - auto-detects family from input_op
geo, in_sop, out_sop = op.TDAPI.CreateGeometryComp(base, 'geo1', input_op=external_sop, x=0, y=0)

# POP version - same API, auto-detects POP family
geo, in_pop, out_pop = op.TDAPI.CreateGeometryComp(base, 'geo1', input_op=external_pop, x=0, y=0)

# Without input connection
geo, in_op, out_op = op.TDAPI.CreateGeometryComp(base, 'geo1', x=0, y=0)
```

---

## Setup Pattern (Full Example)

```python
# CreateGeometryComp handles everything:
# - Creates Geometry COMP
# - Removes default torus
# - Creates In/Out (SOP or POP based on input_op family)
# - Sets viewer=True, display=True, render=True on out_op
# - Connects input_op if provided
geo, in_sop, out_sop = op.TDAPI.CreateGeometryComp(base, 'geo1', input_op=some_sop, x=0, y=0)
```

---

## Design Conditions

- For new networks, prepare source geometry at the parent level and pass it through In/Out so the input is visible without entering the Geometry COMP. Prefer the helper over manually repeating its setup.
- This default is not permission to rebuild an existing sample. A copy request must preserve internal generators, references and behavior unless a change is required by the task.
- Internal processing such as a Material SOP is compatible with the input/output boundary. Connect it into the internal chain rather than leaving it unused.
- A parent reference is not automatically wrong. A material that belongs to the same co-moving component can be referenced locally. For fixed shared resources or interchangeable external components, follow [network design](network-design.md#component-boundaries-and-paths).
- Avoid hidden external data inputs scattered inside the Geometry COMP. Prefer a visible input connection or exposed OP parameter when the input should be exchangeable.

---

## Default New-Network Pattern

For a new component whose nodes move together, prepare shapes at parent level and pass them via In/Out:

```python
# GOOD: shape at parent level
box = op.TDAPI.CreateOp(base, boxPOP, 'box1', x=0, y=0)
null_box = op.TDAPI.CreateOp(base, nullPOP, 'null_box', x=200, y=0)
null_box.inputConnectors[0].connect(box)

# CreateGeometryComp auto-detects POP family from null_box
geo, in_pop, out_pop = op.TDAPI.CreateGeometryComp(base, 'geo1', input_op=null_box, x=400, y=0)
geo.par.instanceop = 'null_chop'  # Relative path
```

---

## Instancing

Geometry COMP supports instancing to render multiple copies efficiently. The `instanceop` parameter accepts various OP types: **CHOP, SOP, POP, TOP, DAT**.

### Basic Example (CHOP)

```python
# 1. Create points (e.g., Grid SOP, Sphere SOP, etc.)
# 2. Null SOP
# 3. SOP to CHOP
sop2chop.par.sop = 'null1'

# 4. Enable instancing on Geometry COMP
geo.par.instancing = True  # Don't forget!
geo.par.instanceop = 'sopto1'
geo.par.instancetx = 'tx'
geo.par.instancety = 'ty'
geo.par.instancetz = 'tz'
```

### Instance Attribute Names by OP Type

| OP Type | Attribute Names | Notes |
|---------|-----------------|-------|
| **CHOP** | Channel names: `tx`, `ty`, `tz`, etc. | Most common pattern |
| **SOP** | `P(0)`, `P(1)`, `P(2)` for position, or custom attributes | Point attributes |
| **POP** | `P(0)`, `P(1)`, `P(2)` for position, or custom attributes | Same as SOP |
| **DAT** | First row values (column headers) | e.g., `tx`, `ty`, `tz` in first row |
| **TOP** | `r`, `g`, `b`, `a` for RGBA channels | Each pixel = one instance |

### Examples by OP Type

```python
# CHOP: use channel names
geo.par.instanceop = 'noise_chop'
geo.par.instancetx = 'tx'

# SOP/POP: use P(n) for position
geo.par.instanceop = 'grid_sop'
geo.par.instancetx = 'P(0)'  # X position
geo.par.instancety = 'P(1)'  # Y position
geo.par.instancetz = 'P(2)'  # Z position

# DAT: use column header names from first row
geo.par.instanceop = 'table_dat'
geo.par.instancetx = 'tx'  # column named 'tx'

# TOP: use r/g/b/a for color channels
geo.par.instanceop = 'noise_top'
geo.par.instancetx = 'r'
geo.par.instancety = 'g'
geo.par.instancetz = 'b'
```

### Mixed Data Sources

You can use different OPs for different attributes:

```python
geo.par.instanceop = 'pos_chop'      # Position from CHOP
geo.par.instancetx = 'tx'
geo.par.instancecolorop = 'color_top' # Color from TOP
geo.par.instancecolorr = 'r'
```

**Common mistake**: Forgetting to set `geo.par.instancing = True`
