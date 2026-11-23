const fs = require('node:fs');

// Production retains a service-role-only historical UUID overload. Its member
// lookup compares UUID to text and is already invalid; preserve that overload
// until a separately reviewed production migration can retire or repair it.
const legacyQuery = `p_miembro_id IS NOT NULL AND NOT EXISTS (\n    SELECT 1\n    FROM public.beneficiarios\n    WHERE id = p_miembro_id AND ong_id = p_ong_id\n  )`;

function classifyLint(report, exitCode) {
  if (!Array.isArray(report) || !Number.isInteger(exitCode)) return 'fail';
  if (exitCode === 0 && report.length === 0) return 'pass';
  if (exitCode !== 1 || report.length !== 1) return 'fail';
  const [entry] = report;
  if (
    entry?.function !== 'public.crear_reporte_aporte' ||
    !Array.isArray(entry.issues) ||
    entry.issues.length !== 1
  )
    return 'fail';
  const [issue] = entry.issues;
  return issue?.level === 'error' &&
    issue.sqlState === '42883' &&
    issue.message === 'operator does not exist: text = uuid' &&
    issue.query?.text === legacyQuery
    ? 'legacy'
    : 'fail';
}

if (require.main === module) {
  try {
    const result = classifyLint(
      JSON.parse(fs.readFileSync(process.argv[2], 'utf8')),
      Number(process.argv[3]),
    );
    if (result === 'legacy') {
      console.warn(
        '::warning::Database lint found the known invalid historical crear_reporte_aporte UUID overload. Production retains it for service_role; review a separate removal or repair.',
      );
    } else if (result === 'fail') {
      console.error('Database lint failed; inspect the full report above.');
      process.exitCode = 1;
    }
  } catch (error) {
    console.error('Unable to read database lint report:', error);
    process.exitCode = 1;
  }
}

module.exports = { classifyLint, legacyQuery };
