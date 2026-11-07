# Operator Operations and Helpers

Read when creating, wiring, positioning operators, or using helper signatures and wildcard syntax. Follow the short [operating rules](basics.md) and [network design policy](network-design.md); examples assume the referenced operators exist and parameter names have been verified.

## Basic Operations

### Create Operator

**Always use `op.TDAPI.CreateOp()` instead of raw API.**

```python
new_op = op.TDAPI.CreateOp(base, glslTOP, 'glsl1', x=0, y=0)
```

**Why CreateOp:**
- **Auto `viewer = True`** - Matches UI-created operator behavior
- **Docked operator handling** - GLSL TOP/MAT create associated DATs (_pixel, _vertex, etc.). CreateOp uses MoveOp internally, which moves docked operators together. Raw `nodeX`/`nodeY` assignment leaves docked operators behind.

**Name auto-increment:** If an operator with the same name exists, TD automatically increments the number (e.g., `null1` → `null2`). Always check the returned operator's `.name` if you need the actual name.

### Connect

```python
# Single connection
op('noise1').inputConnectors[0].connect(op('sphere1'))

# Chain multiple operators (same family only, auto-layout 200px spacing)
chain = op.TDAPI.ChainOperators([grid, noise, null])
```

### Parameters

```python
# After confirming the parameter name with params:
op('mysphere').par.tx = 10

# Expression mode
op('mysphere').par.tx.mode = ParMode.EXPRESSION
op('mysphere').par.tx.expr = 'absTime.seconds'
```

### Display/Render Flags (SOP)

```python
op('out1').display = True
op('out1').render = True
```

### Position

```python
op.TDAPI.MoveOp(op('sphere1'), 0, 0)
```

### Data Access

```python
# CHOP
chop = op('sopto1')
chop.numSamples
chop.chan('tx')[0]      # Single value
chop.chan('tx').vals    # All values

# DAT
dat = op('text1')
dat.text                # Full text
dat.text = 'new'        # Set text
dat[0, 0].val           # Cell value
```

### Find Parameters

**Always verify parameter names before setting them.** TD parameter names are often unpredictable (e.g., `radius` vs `radx/rady/radz`).

```python
# Check parameters before setting
sphere = op('/project1/base1/sphere1')
print([p.name for p in sphere.pars() if 'rad' in p.name.lower()])
# Output: ['radx', 'rady', 'radz']

# Or use TDAPI helper
params = op.TDAPI.GetParameterList('sphereSOP')
```

```python
# Search for specific parameter patterns
for p in op('glsl1').pars():
    if 'vec' in p.name.lower():
        print(f"{p.name}: {p.val}")
```

---

## op.TDAPI Reference

Utility functions accessible via `op.TDAPI.MethodName()`.

### AABB Class

Bounding box type (NamedTuple):

```python
class AABB(NamedTuple):
    min_x: int
    min_y: int
    max_x: int
    max_y: int

    @property
    def width(self) -> int: ...
    @property
    def height(self) -> int: ...
    @property
    def x(self) -> int: ...  # = min_x
    @property
    def y(self) -> int: ...  # = min_y
```

### Method Signatures

```python
# Operator Creation & Movement
def CreateOp(base: OP|str, op_type: type, name: str, x: int|None = None, y: int|None = None) -> OP
def MoveOp(target: OP|str, x: int, y: int) -> OP
def CreateGeometryComp(base: OP|str, name: str, input_op: OP|None = None, x: int|None = None, y: int|None = None) -> tuple[OP, OP, OP]

# Chaining (same family only, 200px spacing)
def ChainOperators(operators: list[OP]) -> list[OP]

# Bounds & Layout
def GetBounds(target: OP|str|list[OP|str]) -> AABB
def GetAllBounds(base: OP|str) -> list[AABB]
def CheckOverlap(bounds1: AABB|list[AABB], bounds2: AABB|list[AABB]) -> bool
def FindEmptyArea(base: OP|str, width: int, height: int, start_x: int = 0, start_y: int = 0, margin: int = 50) -> tuple[int, int]
def FindTypeConversionPosition(source_op: OP|str, target_width: int, target_height: int, direction: str = 'auto', margin: int = 40) -> tuple[int, int]

# Debugging
def PrintLayout(base: OP|None = None) -> None
def CheckErrors(target: OP|str, recurse: bool = True) -> str

# Help (uses TD's built-in help data)
def GetOperatorInfo(op_type: str) -> dict|None
def GetParameterList(op_type: str) -> list[str]
def GetParameterHelp(op_type: str, param_name: str) -> dict|None
```

### Usage Examples

```python
# Create and chain operators
grid = op.TDAPI.CreateOp(base, gridSOP, 'grid1')
noise = op.TDAPI.CreateOp(base, noiseSOP, 'noise1')
null = op.TDAPI.CreateOp(base, nullSOP, 'null1')
chain = op.TDAPI.ChainOperators([grid, noise, null])

# Find empty area and move chain there
bounds = op.TDAPI.GetBounds(chain)
x, y = op.TDAPI.FindEmptyArea(base, bounds.width, bounds.height)
dx, dy = x - bounds.min_x, y - bounds.min_y
for node in chain:
    op.TDAPI.MoveOp(node, node.nodeX + dx, node.nodeY + dy)

# Type conversion positioning
x, y = op.TDAPI.FindTypeConversionPosition(null, 130, 90, direction='auto')
sopto = op.TDAPI.CreateOp(base, soptoCHOP, 'sopto1', x, y)

# Get operator help
info = op.TDAPI.GetOperatorInfo('noiseSOP')
params = op.TDAPI.GetParameterList('noiseSOP')
```

In the next, separate `execute` call, after TD has had a frame boundary to update error state:

```python
# Use the actual edited component path; variables do not persist across execute calls.
base = op('/project1/example')
op.TDAPI.PrintLayout(base)
errors = op.TDAPI.CheckErrors(base, recurse=True)
```

---

## Pattern Matching

Many parameters accept wildcards to specify multiple operators, channels, etc.

### Wildcards

| Pattern | Matches |
|---------|---------|
| `*` | Any string (including empty) |
| `?` | Any single character |
| `[xyz]` | Any character in brackets |
| `^name` | Exclude (after other patterns) |

### Examples

```python
# Render TOP - geometry/lights parameters
render.par.geometry = 'geo*'           # All geo1, geo2, geo3...
render.par.lights = 'light*'           # All lights
render.par.geometry = 'geo* ^geo7'     # All geo* except geo7

# Find operators
ops('null*')                           # All nulls
ops('*chop*')                          # Anything with 'chop' in name

# Find parameters
op('geo1').pars('t?')                  # tx, ty, tz
op('geo1').pars('t?', 'r?', 's?')      # translate/rotate/scale
```

### Common Use Cases

```python
# Render all geometry with prefix
render.par.geometry = 'env_*'          # Environment objects
render.par.lights = 'key_* fill_*'     # Key and fill lights

# Exclude specific items
render.par.geometry = '* ^debug_*'     # All except debug objects
```

---

## Layout

### Layout Rules

- Data flows **left to right** (increasing X)
- COMP hierarchy flows **top to bottom**
- **Check layout before creating** to avoid overlap

### Spacing

| Direction | Spacing | Notes |
|-----------|---------|-------|
| X | 200+ | Horizontal chain |
| Y | 130+ | SOP/TOP/CHOP/DAT |
| Y | 160+ | COMP (larger) |

Use `op.TDAPI` utilities for layout management. See [op.TDAPI Reference](#optdapi-reference).

### Type Conversion: Stack Vertically

When operator type changes (SOP→CHOP), keep same X, stack Y:

```
null1 (X=200, Y=-270) [SOP]
    ↓
sopto1 (X=200, Y=-145) [CHOP] → null2 (X=400)
```

Use `FindTypeConversionPosition(source_op, width, height, direction='auto')` for automatic placement.

### Docked Operators

GLSL TOP/MAT, Script SOP create associated DATs.

- Use `MoveOp()` to move them together (handles docked automatically)
- Use `CreateOp()` with position to place correctly on creation
- `GetBounds()` includes docked operators in calculation

**Note:** Setting `nodeX`/`nodeY` directly does NOT move docked operators. Always use `MoveOp`.

---
