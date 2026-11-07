"""Read-only network design rules. No TouchDesigner imports or code execution."""

import ast
import hashlib


def expression_length(record, tree, limit):
    if record['kind'] == 'expression' and len(record['code']) > limit:
        yield (1, record['code'],
               f"Expression has {len(record['code'])} characters (limit {limit}).")


def _parent_call(node):
    return isinstance(node, ast.Call) and (
        isinstance(node.func, ast.Name) and node.func.id == 'parent' or
        isinstance(node.func, ast.Attribute) and node.func.attr == 'parent')


def deep_parent(record, tree, limit):
    for node in ast.walk(tree) if tree else ():
        if _parent_call(node):
            depth = node.args[0] if node.args else next(
                (kw.value for kw in node.keywords if kw.arg == 'n'), None)
            if isinstance(depth, ast.Constant) and type(depth.value) is int and depth.value >= 3:
                yield node.lineno, ast.get_source_segment(record['code'], node), 'parent depth is 3 or greater.'


def chained_parent(record, tree, limit):
    for node in ast.walk(tree) if tree else ():
        if (_parent_call(node) and isinstance(node.func, ast.Attribute)
                and _parent_call(node.func.value)):
            yield node.lineno, ast.get_source_segment(record['code'], node), 'Consecutive parent() calls.'


# Add a function and an entry here; keep detection independent of TD collection.
RULES = (
    ('expression-length', expression_length,
     'Long parameter expressions hide processing and make later edits difficult.',
     'Prefer standard operators; put complex preprocessing in Script DAT/CHOP and expose editable controls.'),
    ('deep-parent', deep_parent,
     'Moving this component may break references to an assumed outer hierarchy.',
     'Check whether this is a fixed shared resource or an external input; use an explicit path or input parameter.'),
    ('chained-parent', chained_parent,
     'Dependencies on surrounding placement are hidden in the expression or script.',
     'Make the dependency explicit. Replacing the chain with parent(2) alone does not fix the design.'),
)


def audit_records(records, max_expression_length=70):
    """Return findings and coverage errors; never evaluate supplied Python."""
    if type(max_expression_length) is not int or max_expression_length < 0:
        raise ValueError('max_expression_length must be a non-negative integer')
    findings, errors = [], []
    for record in records:
        try:
            tree = ast.parse(record['code'], mode='eval' if record['kind'] == 'expression' else 'exec')
        except (SyntaxError, ValueError) as exc:
            tree = None
            errors.append(dict(path=record['path'], parameter=record.get('parameter'),
                               message=f'Python parsing failed; hierarchy rules not checked: {exc}'))
        for rule_id, check, problem, suggestion in RULES:
            for line, snippet, message in check(record, tree, max_expression_length):
                identity = '\0'.join([rule_id, record['path'], record.get('parameter') or '',
                                      str(line), snippet or ''])
                findings.append(dict(
                    id=hashlib.sha256(identity.encode()).hexdigest()[:20],
                    rule=rule_id, severity='warning', path=record['path'],
                    parameter=record.get('parameter'), kind=record['kind'], line=line,
                    snippet=snippet, message=message, expectedProblem=problem, suggestion=suggestion,
                    enabled=record.get('enabled'), isDefault=record.get('isDefault'),
                    matchesCloneSource=record.get('matchesCloneSource'),
                    cloneSource=record.get('cloneSource')))
    return dict(findings=findings, errors=errors)
