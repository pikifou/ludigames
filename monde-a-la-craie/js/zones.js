// Les zones du jeu : leur nom, leur projection et le cadre (longitudes, latitudes) à montrer en entier.
// d3 (d3-geo) est chargé avant les modules, en script classique (lib/).
const d3 = globalThis.d3;
// Une seule face du globe : sinon l'autre face se replie en un grand arc au bord de la carte.
const hemisphere = () => d3.geoAzimuthalEqualArea().clipAngle(90);

export const ZONES = [
  { id: 'europe', fr: 'Europe', en: 'Europe',
    projection: () => d3.geoConicConformal().rotate([-14, 0]).parallels([40, 62]), cadre: [[-25, 34], [45, 71]] },
  { id: 'afrique', fr: 'Afrique', en: 'Africa',
    projection: () => hemisphere().rotate([-18, -2]), cadre: [[-26, -36], [58, 38]] },
  { id: 'asie', fr: 'Asie', en: 'Asia',
    projection: () => hemisphere().rotate([-88, -25]), cadre: [[25, -11], [146, 55]] },
  { id: 'amerique-nord', fr: 'Amérique du Nord', en: 'North America',
    projection: () => hemisphere().rotate([100, -45]), cadre: [[-168, 7], [-52, 72]] },
  { id: 'amerique-sud', fr: 'Amérique du Sud', en: 'South America',
    projection: () => hemisphere().rotate([60, 15]), cadre: [[-82, -56], [-34, 13]] },
  { id: 'oceanie', fr: 'Océanie', en: 'Oceania',
    projection: () => hemisphere().rotate([-160, 12]), cadre: [[110, -48], [190, 12]] },
];

export const MONDE = { id: 'monde', fr: 'Le monde entier', en: 'The whole world',
  projection: () => d3.geoNaturalEarth1(), cadre: [[-180, -56], [180, 83]] };

export function zoneParId(id) { return id === 'monde' ? MONDE : ZONES.find(z => z.id === id); }

// Où écrire le nom d'un pays et où le montrer, quand le centre de sa plus grande forme ne convient pas.
export const ANCRES = {
  RU: [40, 56],      // la Russie d'Europe, pas la Sibérie
  KI: [173, 1.4],    // Tarawa
  US: [-98, 39],
  CA: [-100, 56],
  NO: [9, 61],
  CL: [-71, -33],
  FJ: [178, -17.8],
  ID: [114, -1],
  SO: [46.5, 5.5],   // la Somalie en L : son centre tombe en Éthiopie
  VN: [105.8, 21],   // le Vietnam en S : son centre tombe au Laos
  MY: [102, 4],      // la Malaisie de la péninsule, loin de Brunei
  IT: [14.4, 41.6],  // le centre de l'Italie est sur Saint-Marin
  IL: [34.85, 30.9],
  JO: [36.6, 30.8],
};

// Le cadre comme semis de points (les bords suivent méridiens et parallèles, quelle que soit la projection).
export function cadrePoints([[o, s], [e, n]]) {
  const pts = [];
  for (let i = 0; i <= 12; i++) {
    const lon = o + (e - o) * i / 12, lat = s + (n - s) * i / 12;
    pts.push([lon, s], [lon, n], [o, lat], [e, lat]);
  }
  return { type: 'MultiPoint', coordinates: pts };
}
