import { it, expect } from 'vitest';
import { readdirSync, readFileSync, statSync } from 'fs';
import { join } from 'path';

function findRouteFiles(dir: string): string[] {
  const results: string[] = [];
  for (const entry of readdirSync(dir)) {
    const fullPath = join(dir, entry);
    const stat = statSync(fullPath);
    if (stat.isDirectory()) {
      results.push(...findRouteFiles(fullPath));
    } else if (entry === 'route.ts') {
      results.push(fullPath);
    }
  }
  return results;
}

it('every route that records usage also checks the limit', () => {
  const apiDir = join(process.cwd(), 'app', 'api');
  const routeFiles = findRouteFiles(apiDir);

  const violations: string[] = [];
  for (const file of routeFiles) {
    const content = readFileSync(file, 'utf-8');
    const hasRecordUsage = content.includes('recordUsage(');
    const hasCheckLimit = content.includes('checkLimit(');
    if (hasRecordUsage && !hasCheckLimit) {
      violations.push(file);
    }
  }

  expect(violations, `Routes that call recordUsage without checkLimit: ${violations.join(', ')}`).toHaveLength(0);
});
