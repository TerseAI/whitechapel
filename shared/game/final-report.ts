export function reportKey(findings: readonly string[]) { return [...new Set(findings)].sort().join('|'); }
