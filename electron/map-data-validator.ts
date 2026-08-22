import fs from 'node:fs';
import path from 'node:path';

export interface MapDataValidationResult {
  valid: boolean;
  missingFiles: string[];
  error?: string;
}



export function validateMapDataDir(dataDir: string | null | undefined): MapDataValidationResult {
  if (!dataDir || !dataDir.trim()) {
    return { valid: false, missingFiles: ['europe-graph.json', 'europe-nodes.json'] };
  }

  const resolved = path.resolve(dataDir);

  if (!fs.existsSync(resolved) || !fs.statSync(resolved).isDirectory()) {
    return { valid: false, missingFiles: [], error: `Map data directory does not exist: ${resolved}` };
  }

  const hasEurope = fs.existsSync(path.join(resolved, 'europe-graph.json')) && fs.existsSync(path.join(resolved, 'europe-nodes.json'));
  const hasUsa = fs.existsSync(path.join(resolved, 'usa-graph.json')) && fs.existsSync(path.join(resolved, 'usa-nodes.json'));

  const missingFiles: string[] = [];
  if (!hasEurope && !hasUsa) {
    missingFiles.push('europe-graph.json', 'europe-nodes.json');
  }

  return {
    valid: missingFiles.length === 0,
    missingFiles,
  };
}

export function getMapDataDirFromSettings(settings: Record<string, unknown>): string | null {
  return settings?.mapDataDir || null;
}
