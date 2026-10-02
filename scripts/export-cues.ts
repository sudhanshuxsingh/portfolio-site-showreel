// npx tsx scripts/export-cues.ts → out/cues.json (music edit + sound cues + scenes)
import fs from 'node:fs';
import { buildCues } from '../src/cues';
import { DURATION, music, T } from '../src/timeline';

fs.mkdirSync('out', { recursive: true });
fs.writeFileSync(
  'out/cues.json',
  JSON.stringify({ duration: DURATION, music, scenes: T, cues: buildCues() }, null, 1)
);
console.log(`out/cues.json — ${buildCues().length} cues, ${music.length} music segments, ${DURATION}s`);
