import sys
import unittest
from pathlib import Path
from types import SimpleNamespace

sys.path.insert(0, str(Path(__file__).resolve().parents[1] / 'skills/touchdesigner/assets/toe/src'))
from td_audit import audit_records, literal_op_reference
from td_utils import AuditNetwork


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

    def test_line_moves_and_duplicate_findings(self):
        before = audit_records([record('x = parent(3)', 'dat')])['findings'][0]
        after = audit_records([record('# comment\nx = parent(3)\ny = parent(3)', 'dat')])['findings']
        self.assertEqual(before['id'], after[0]['id'])
        self.assertNotEqual(after[0]['id'], after[1]['id'])
        self.assertEqual(after[0]['line'], 2)

    def test_leading_space_keeps_length_but_parses_expression(self):
        result = audit_records([record('  parent(3)')])
        self.assertFalse(result['errors'])
        self.assertEqual(result['findings'][0]['rule'], 'deep-parent')
        self.assertEqual(result['findings'][0]['snippet'], 'parent(3)')
        self.assertEqual(audit_records([record(' ' + repr('x' * 68))])['findings'][0]['rule'], 'expression-length')

    def test_clone_reference_whitelist(self):
        self.assertEqual(literal_op_reference("op.TDTox.op('defaultCOMPs/button')"), ('TDTox', 'defaultCOMPs/button'))
        self.assertEqual(literal_op_reference("op('../template')"), (None, '../template'))
        for code in ["op('/target').store('probe', 1) or op('/template')", 'op(compute())', 'parent().op("x")']:
            self.assertIsNone(literal_op_reference(code))

    def test_invalid_limit(self):
        for limit in (-1, True, '70'):
            with self.assertRaises(ValueError):
                audit_records([], limit)

    def test_dynamic_clone_does_not_evaluate_or_inherit_provenance(self):
        def forbidden():
            self.fail('Dynamic metadata expression was evaluated')
        source = SimpleNamespace(path='/template', text='x = parent(3)')
        source.op = lambda name: source
        dat = SimpleNamespace(path='/root/nested/code', name='code', family='DAT', isText=True,
                              text='x = parent(3)', pars=lambda: [],
                              par=SimpleNamespace(language=SimpleNamespace(mode='CONSTANT', eval=lambda: 'python')))
        for mode in ('EXPRESSION', 'BIND', 'EXPORT'):
            nested = SimpleNamespace(path='/root/nested', name='nested', family='COMP',
                                     children=[dat], pars=lambda: [],
                                     par=SimpleNamespace(clone=SimpleNamespace(mode=mode, expr='danger()', eval=forbidden)))
            root = SimpleNamespace(path='/root', family='COMP', children=[nested], pars=lambda: [],
                                   par=SimpleNamespace(clone=SimpleNamespace(mode='CONSTANT', eval=lambda: source)))
            result = AuditNetwork(None, root)
            self.assertTrue(result['complete'])
            self.assertIsNone(result['findings'][0]['cloneSource'])
            self.assertIsNone(result['findings'][0]['matchesCloneSource'])


if __name__ == '__main__':
    unittest.main()
