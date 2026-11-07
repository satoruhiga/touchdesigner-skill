# Saving Operator Data

Read when exporting images, channels, tables or geometry. Choose the requested destination and preserve existing files unless replacement is in scope.

Use `.save()` method to export operator data to files.

### TOP → Image

```python
import tempfile, os

# Save to temp file (reuse same filename to avoid disk bloat)
PREVIEW_PATH = os.path.join(tempfile.gettempdir(), 'td_preview.jpg')
op('/project1/render1').save(PREVIEW_PATH)

# Supported formats: .jpg, .png, .tiff, .exr, etc.
# Clean up after use
os.remove(PREVIEW_PATH)
```

### CHOP → .clip

```python
# Save channel data as .clip (text-based format)
chop = op('/project1/noise1')
chop.save(project.folder + '/noise1.clip')
```

`.clip` format stores:
- `rate` - Frame rate
- `tracklength` - Number of samples
- `tracks` - Channel count
- Per-track: `name` and `data_rle` (sample values)

### DAT → .csv / .tsv

```python
# Save table data as CSV
dat = op('/project1/table1')
dat.save(project.folder + '/table1.csv')

# Or TSV (tab-separated)
dat.save(project.folder + '/table1.tsv')
```

Output includes header row from first row of DAT.

### SOP → .obj

```python
# Save geometry as OBJ
sop = op('/project1/sphere1')
sop.save(project.folder + '/sphere1.obj')
```
