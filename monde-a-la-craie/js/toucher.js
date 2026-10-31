// Quel pays le doigt a-t-il touché ? Les tout petits pays ont une zone de toucher élargie autour de leur centre.

export const RAYON_MIN = 44;   // px CSS : un doigt d'enfant

// point : [x, y] à l'écran. cibles : { code, contient(point), centre: [x, y], rayon }[].
// D'abord le pays sous le doigt ; sinon le pays dont le centre est le plus proche, à moins de RAYON_MIN.
// (Le cercle n'est jamais plus grand que RAYON_MIN : un grand pays n'attrape pas la mer autour de lui.)
export function paysTouche(point, cibles) {
  for (const c of cibles) if (c.contient(point)) return c.code;
  let meilleur = null, dMin = RAYON_MIN;
  for (const c of cibles) {
    const d = Math.hypot(point[0] - c.centre[0], point[1] - c.centre[1]);
    if (d <= dMin) { dMin = d; meilleur = c.code; }
  }
  return meilleur;
}
