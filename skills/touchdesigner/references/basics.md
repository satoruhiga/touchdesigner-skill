# Operating Basics

Read once per session before changing a network. Live read-only inquiries do not require the creation and layout references.

## Inspect before changing

Use `params` or `inspect` to verify parameter names and current values before assignment. Names vary by operator; do not guess them. Use the existing network and prepared data before adding another processing path. See [network design](network-design.md) for representation and component-boundary decisions.

## Create, connect and move

- Use `op.TDAPI.CreateOp` when creating operators. It enables the viewer and positions docked DATs together with their owner.
- Check the returned operator name: TD increments names when the requested name exists.
- Use `MoveOp` for movement so docked operators follow. Moving one operator does not move a connected chain; apply the same offset to each member when moving a group.
- `ChainOperators` connects operators of the same family and lays them out with 200-pixel horizontal spacing.
- Inspect the layout before adding nodes. Keep data flow readable and avoid overlap.
- OpenGL coordinates are right-handed, Y-up and Z toward the camera; default transform order is SRT.

Read [operator operations](operator-operations.md) for connection, data-access, helper, wildcard and layout examples when those tasks are needed. Read [saving data](saving-data.md) only when exporting operator data.

## Validate changes

After a meaningful change, inspect its output and run the design audit as described in [network design](network-design.md). When testing an alternate input or control, restore the requested final state afterwards.

TD error state updates across frame boundaries. Make the change in one `execute` call, then check errors in a separate call; checking immediately in the same call may see stale state.

```python
# In the separate verification call; accepts an OP or a string path.
result = op.TDAPI.CheckErrors('/project1/example', recurse=True)
```

`CheckErrors` requires a valid target (not None), forces a cook and returns an error string or an empty string. It is a functional check, distinct from the design audit, which does not deliberately cook or rewrite the network. Confirm the relevant output and editing operation, not only the absence of errors.
