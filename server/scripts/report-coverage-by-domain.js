const fs = require('fs');
const path = require('path');

const coverageSummaryPath = path.resolve(__dirname, '../coverage/coverage-summary.json');

if (!fs.existsSync(coverageSummaryPath)) {
  console.error('Coverage summary not found. Run Jest with --coverage first.');
  process.exit(1);
}

const coverage = JSON.parse(fs.readFileSync(coverageSummaryPath, 'utf8'));
const metrics = ['statements', 'branches', 'functions', 'lines'];
const domainNames = ['auth', 'products', 'users', 'audit', 'basket', 'other'];

const domainGroups = Object.fromEntries(
  domainNames.map((domain) => [
    domain,
    {
      files: 0,
      statements: { total: 0, covered: 0 },
      branches: { total: 0, covered: 0 },
      functions: { total: 0, covered: 0 },
      lines: { total: 0, covered: 0 },
    },
  ])
);

const inferDomain = (filePath) => {
  const normalized = filePath.replace(/\\/g, '/').toLowerCase();

  if (normalized.includes('/routes/auth') || normalized.includes('/auth/') || normalized.includes('/auth.post')) {
    return 'auth';
  }

  if (normalized.includes('/routes/products') || normalized.includes('/products/') || normalized.includes('/product-')) {
    return 'products';
  }

  if (normalized.includes('/routes/users') || normalized.includes('/users/') || normalized.includes('/user-')) {
    return 'users';
  }

  if (normalized.includes('/routes/audit') || normalized.includes('/audit/') || normalized.includes('/v2/audit')) {
    return 'audit';
  }

  if (normalized.includes('/routes/basket') || normalized.includes('/basket/') || normalized.includes('/v2/basket')) {
    return 'basket';
  }

  return 'other';
};

Object.entries(coverage).forEach(([filePath, fileCoverage]) => {
  const normalized = filePath.replace(/\\/g, '/').toLowerCase();

  if (!normalized.includes('/routes/')) {
    return;
  }

  const domain = inferDomain(filePath);
  const group = domainGroups[domain];

  group.files += 1;

  metrics.forEach((metric) => {
    const metricCoverage = fileCoverage[metric];

    if (!metricCoverage || typeof metricCoverage.total !== 'number') {
      return;
    }

    group[metric].total += metricCoverage.total;
    group[metric].covered += metricCoverage.covered;
  });
});

const formatPercentage = (total, covered) => {
  if (!total) {
    return '0.0%';
  }

  return `${((covered / total) * 100).toFixed(1)}%`;
};

const printGroup = (domain, group) => {
  if (group.files === 0) {
    return;
  }

  const metricSummary = metrics
    .map((metric) => `${metric}: ${formatPercentage(group[metric].total, group[metric].covered)}`)
    .join(' | ');

  console.log(`${domain.toUpperCase()}: ${metricSummary} (${group.files} files)`);
};

console.log('Coverage by migrated domain\n');
Object.entries(domainGroups)
  .filter(([, group]) => group.files > 0)
  .forEach(([domain, group]) => printGroup(domain, group));
