# Operator Families Reference

## Contents

1. [Family Overview](#family-overview)
2. [SOP vs POP](#sop-vs-pop)
3. [Cross-Family Patterns](#cross-family-patterns)
4. [Data Conversion Examples](#data-conversion-examples)
5. [Getting Operator Details](#getting-operator-details)

---

## Family Overview

The families below cover common dataflow and component tasks. Materials use the MAT family; use the running build's help for available operator types.

| Family | Purpose | Data Type | Example Use |
|--------|---------|-----------|-------------|
| **SOP** | Surface/Geometry | 3D geometry (points, polygons, meshes) | Modeling, procedural geometry |
| **POP** | Point/Particle | GPU-based 3D points, particles | Particle systems, point clouds (GPU) |
| **TOP** | Texture | 2D images, video, textures | Image processing, compositing |
| **CHOP** | Channel | Time-based data, motion, audio | Animation, audio analysis, data streams |
| **DAT** | Data | Tables, text, scripts | Data manipulation, Python scripts |
| **COMP** | Component | Containers, 3D scenes, UI | Scene hierarchy, UI panels, networks |

---

## SOP vs POP

Both handle 3D geometry but differ in execution:

| Aspect | SOP | POP |
|--------|-----|-----|
| Execution | CPU | GPU |
| History | Legacy, stable | New (2025), experimental |
| Use case | Modeling, static geometry | Particles, large point clouds |
| Geometry COMP | Uses In/Out SOP | Uses In/Out POP |

**Key insight**: SOP and POP are conceptually similar. Patterns that work for SOP typically work for POP with renamed operators.

---

## Cross-Family Patterns

Operator families share common patterns. When working with an unfamiliar family, apply known patterns from other families.

### Universal Operators

Common patterns across dataflow families (verify availability in the running build):

| Pattern | SOP | POP | TOP | CHOP | DAT |
|---------|-----|-----|-----|------|-----|
| Input | inSOP | inPOP | inTOP | inCHOP | inDAT |
| Output | outSOP | outPOP | outTOP | outCHOP | outDAT |
| Null | nullSOP | nullPOP | nullTOP | nullCHOP | nullDAT |
| Select | selectSOP | selectPOP | selectTOP | selectCHOP | selectDAT |
| Switch | switchSOP | switchPOP | switchTOP | switchCHOP | switchDAT |
| Merge | mergeSOP | mergePOP | compositeTOP | mergeCHOP | mergeDAT |

### Conversion Operators

Convert between families using `sourcetoTarget` naming:

```
soptoCHOP  - SOP points → CHOP channels (tx, ty, tz)
choptoSOP  - CHOP channels → SOP points
soptoPOP   - SOP geometry → POP points (CPU → GPU)
choptoPOP  - CHOP channels → POP points
poptoCHOP  - POP points → CHOP channels
choptoTOP  - CHOP → texture
toptoCHOP  - TOP pixels → CHOP channels
choptoDAT  - CHOP → table (rows = samples)
soptoDAT   - SOP → table (with P, N, etc.)
poptoDAT   - POP → table
```

### Applying Patterns to New Families

When encountering an unfamiliar operator family:

1. Query the candidate operator with `params OP_TYPE` or `info OP_TYPE` before creating it.
2. Check the current TD build's operator and parameter information rather than assuming a renamed operator is available.
3. Reuse a known pattern only after confirming its input and output meanings match.
4. Use official documentation when local help does not resolve the uncertainty.

---

## Data Conversion Examples

### SOP to CHOP

Extracts point attributes (position, normals, custom attributes) from SOP geometry into CHOP channels.

```python
sop2chop = op.TDAPI.CreateOp(base, soptoCHOP, 'sopto1', x=0, y=0)
sop2chop.par.sop = 'null1'
# Generates channels: tx, ty, tz, nx, ny, nz, etc.
```

### CHOP to SOP

Converts CHOP channel data back into SOP point positions/attributes.

```python
chop2sop = op.TDAPI.CreateOp(base, choptoSOP, 'chopto1', x=0, y=0)
chop2sop.par.chop = 'null_chop'
# Maps channels tx, ty, tz → point positions P(0), P(1), P(2)
```

### CHOP to POP

Creates POP points from CHOP channel data.

```python
chop2pop = op.TDAPI.CreateOp(base, choptoPOP, 'choptopop1', x=0, y=0)
chop2pop.par.chop = 'null_chop'
```

### SOP to POP

Converts SOP geometry to POP points (CPU → GPU).

```python
sop2pop = op.TDAPI.CreateOp(base, soptoPOP, 'soptopop1', x=0, y=0)
sop2pop.par.sop = op('null1')  # Requires op() reference, not string
```

### CHOP to TOP

Visualizes CHOP data as a texture.

```python
chop2top = op.TDAPI.CreateOp(base, choptoTOP, 'choptotop1', x=0, y=0)
chop2top.par.chop = 'null_chop'
```

### TOP to CHOP

Extracts pixel values from TOP as CHOP channels.

```python
top2chop = op.TDAPI.CreateOp(base, toptoCHOP, 'toptochop1', x=0, y=0)
top2chop.par.top = 'null_top'
```

### CHOP to DAT

Converts CHOP channels to a table (rows = samples, columns = channels).

```python
chop2dat = op.TDAPI.CreateOp(base, choptoDAT, 'choptodat1', x=0, y=0)
chop2dat.par.chop = 'sopto1'
```

### SOP to DAT

Exports SOP point data to a table with headers.

```python
sop2dat = op.TDAPI.CreateOp(base, soptoDAT, 'soptodat1', x=0, y=0)
sop2dat.par.sop = 'null1'
# Headers: index, P(0), P(1), P(2), Pw, N(0), N(1), N(2), groups
```

### POP to DAT

Exports POP point data to a table.

```python
pop2dat = op.TDAPI.CreateOp(base, poptoDAT, 'poptodat1', x=0, y=0)
pop2dat.par.pop = 'null_pop'
```

### Points Only Won't Render

SOP points alone don't render - they need primitives.

**Solution**: Convert to particles:

```python
convert = op.TDAPI.CreateOp(base, convertSOP, 'convert1', x=0, y=0)
convert.par.totype = 'particlesperpoint'
convert.inputConnectors[0].connect(point_sop)
```

---

## Getting Operator Details

Use `/ui/dialogs/parGrabber/offlineHelp` DAT to get operator summaries and parameter info:

```python
import json
help_data = json.loads(op('/ui/dialogs/parGrabber/offlineHelp').text)

# Get operator summary
summary = help_data['help']['POPs']['spherePOP']['summary']
# → "The Sphere POP creates a sphere shape..."

# List all operators in a family
pop_ops = list(help_data['help']['POPs'].keys())

# Get parameter info
params = help_data['help']['POPs']['spherePOP']['parameters']
for name, info in params.items():
    print(f"{name}: {info['summary']}")
```
