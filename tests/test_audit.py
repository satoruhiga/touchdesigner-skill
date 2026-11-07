import sys
import unittest
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1] / 'skills/touchdesigner/assets/toe/src'))
from td_audit import audit_records


def record(code, kind='expression'):
    return dict(path='/test/node', parameter='value' if kind == 'expression' else None,
                kind=kind, code=code)


class AuditTests(unittest.TestCase):
    def test_length_boundary_and_unicode(self):
        for size in (70, 71):
            result = audit_records([record(repr('あ' * (size - 2)))])
            self.assertEqual(len(result['findings']), int(size > 70))
        self.assertFalse(audit_records([record(repr('x' * 90))], 100)['findings'])

    def test_parent_calls_not_comments_or_strings(self):
        result = audit_records([record("# parent(4)\ns = 'parent().parent()'\nx = me.parent(3)\ny = parent().parent()", 'dat')])
        self.assertEqual([(f['rule'], f['line']) for f in result['findings']],
                         [('deep-parent', 3), ('chained-parent', 4)])

    def test_local_references_and_keyword_depth(self):
        self.assertFalse(audit_records([record("parent(2).op('out1')")])['findings'])
        self.assertEqual(audit_records([record('parent(n=4)')])['findings'][0]['rule'], 'deep-parent')

    def test_parse_failure_is_not_clean(self):
        result = audit_records([record('parent(')])
        self.assertTrue(result['errors'])

    def test_dat_length_not_expression_length(self):
        self.assertFalse(audit_records([record('x = 1\n' * 100, 'dat')])['findings'])

    def test_metadata_and_stable_identity(self):
        item = dict(record('parent(3)'), matchesCloneSource=True, cloneSource='/sys/template')
        first = audit_records([item])['findings'][0]
        self.assertTrue(first['matchesCloneSource'])
        self.assertEqual(first['id'], audit_records([item])['findings'][0]['id'])

    def test_invalid_limit(self):
        for limit in (-1, True, '70'):
            with self.assertRaises(ValueError):
                audit_records([], limit)


if __name__ == '__main__':
    unittest.main()
