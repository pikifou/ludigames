// Charge d3-geo et topojson-client (copiés dans le jeu) pour les tests Node.
import { readFileSync } from 'node:fs';
import vm from 'node:vm';

const lib = new URL('../monde-a-la-craie/lib/', import.meta.url);
const ctx = { d3: {} };
ctx.self = ctx; ctx.globalThis = ctx;
for (const f of ['d3-array.min.js', 'd3-geo.min.js', 'topojson-client.min.js']) vm.runInNewContext(readFileSync(new URL(f, lib), 'utf8'), ctx);
export const d3 = ctx.d3;
export const topojson = ctx.topojson;

export function monde() {
  const topo = JSON.parse(readFileSync(new URL('../monde-a-la-craie/data/monde.json', import.meta.url), 'utf8'));
  return { topo, pays: topojson.feature(topo, topo.objects.pays).features };
}
