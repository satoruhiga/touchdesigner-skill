export function compareAudits(current, baseline) {
  if (baseline?.path !== current.path || baseline.maxExpressionLength !== current.maxExpressionLength || !Array.isArray(baseline.findings)) {
    throw new Error('Baseline must have the same target path and expression limit.');
  }
  const previous = new Set(baseline.findings.map(f => f.id));
  const present = new Set(current.findings.map(f => f.id));
  const complete = baseline.complete === true && current.complete === true;
  const absent = baseline.findings.filter(f => !present.has(f.id));
  return {
    ...current,
    findings: current.findings.map(f => ({
      ...f, status: previous.has(f.id) ? 'existing' : baseline.complete === true ? 'new' : 'unverified',
    })),
    comparison: {
      complete, baselineComplete: baseline.complete === true,
      resolved: complete ? absent : [], unverified: complete ? [] : absent,
    },
  };
}
