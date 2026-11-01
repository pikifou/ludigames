// Les trois niveaux : on commence par les pays qu'un enfant connaît déjà un peu, pas par les plus grands.
// Facile : les pays de FACILE. Moyen : ceux de FACILE et de MOYEN. Difficile : tous les pays.
// Pour changer un pays de niveau, il suffit de déplacer son code d'une liste à l'autre (ou de l'enlever : il passe en Difficile).

export const NIVEAUX = ['facile', 'moyen', 'difficile'];
export const NIVEAU_PAR_DEFAUT = 'facile';

const FACILE = [
  // Europe
  'FR', 'ES', 'IT', 'DE', 'GB', 'PT', 'BE', 'CH', 'NL', 'GR', 'RU', 'NO', 'SE', 'PL',
  // Afrique
  'EG', 'MA', 'DZ', 'TN', 'SN', 'CI', 'MG', 'ZA', 'KE', 'CM', 'ML', 'NG',
  // Asie
  'CN', 'IN', 'JP', 'KR', 'TR', 'SA', 'TH', 'VN', 'ID', 'MN', 'PH', 'KZ',
  // Amérique du Nord
  'US', 'CA', 'MX', 'CU', 'JM', 'HT',
  // Amérique du Sud
  'BR', 'AR', 'CL', 'PE', 'CO', 'VE',
  // Océanie
  'AU', 'NZ', 'PG', 'FJ',
];

const MOYEN = [
  // Europe
  'IE', 'DK', 'AT', 'FI', 'IS', 'UA', 'CZ', 'HU', 'RO', 'HR', 'BG', 'LU', 'BY', 'RS', 'MD',
  // Afrique
  'LY', 'SD', 'ET', 'TZ', 'CD', 'CG', 'GA', 'NE', 'TD', 'BF', 'GN', 'GH', 'MR', 'AO', 'SO', 'NA',
  // Asie
  'IR', 'IQ', 'PK', 'AF', 'NP', 'MY', 'SG', 'KP', 'IL', 'AE', 'QA', 'KH', 'SY', 'LK', 'LA', 'MM',
  // Amérique du Nord
  'GT', 'CR', 'PA', 'DO', 'BS', 'HN', 'NI',
  // Amérique du Sud
  'BO', 'EC', 'UY', 'PY',
  // Océanie
  'VU', 'SB', 'WS', 'TO',
];

const FACILES = new Set(FACILE), MOYENS = new Set(MOYEN);
export const LISTES = { facile: FACILE, moyen: MOYEN };

// Le premier niveau où l'on rencontre ce pays.
export function niveauDe(code) {
  return FACILES.has(code) ? 'facile' : MOYENS.has(code) ? 'moyen' : 'difficile';
}

// Le pays est-il interrogé à ce niveau ?
export function dansNiveau(code, niveau) {
  return NIVEAUX.indexOf(niveauDe(code)) <= NIVEAUX.indexOf(niveau);
}

export function niveauValide(n) { return NIVEAUX.includes(n) ? n : NIVEAU_PAR_DEFAUT; }
