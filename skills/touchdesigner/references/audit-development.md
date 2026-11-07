# Audit Development

For changes to audit implementation and bridge packaging, not ordinary network editing.

## Extending the audit

`assets/toe/src/td_audit.py` is pure Python. Add a check function and register it in `RULES`; each check receives a source record, parsed AST and length limit, and yields `(line, snippet, message)`. Register the expected problem and suggestion alongside it. `td_utils.AuditNetwork` collects live data; TDAPI exposes `GET /audit?path=...`, and the client calls it with `audit`.

Run `python -m unittest discover -s tests -v` and `node --test tests/audit-comparison.test.mjs` from the repository root. Test positive and negative examples, especially standard references and code-like strings. When shipping rule changes, update the bundled `td_audit` DAT in the development bridge and export the TOX so the standalone asset contains the same rules.
