// Quel pays le doigt a-t-il touché ? Les tout petits pays ont une zone de toucher élargie autour de leur centre.

export const RAYON_MIN = 44;    // px CSS : un doigt d'enfant
export const PETIT = 8;         // un pays dont le rayon à l'écran est sous 8 px est « petit » : dessiné avec un rond de craie
export const RAYON_PETIT = 14;  // toucher ce rond choisit le petit pays, même à l'intérieur d'un grand (Vatican, Saint-Marin)

// point : [x, y] à l'écran. cibles : { code, contient(point), centre: [x, y], rayon }[] (rayon à l'écran).
// 1. le rond d'un petit pays ; 2. le pays sous le doigt ; 3. le petit pays le plus proche, à moins de RAYON_MIN.
// (Un grand pays n'a pas de zone élargie : il n'attrape pas la mer autour de lui.)
export function paysTouche(point, cibles) {
  const distance = c => Math.hypot(point[0] - c.centre[0], point[1] - c.centre[1]);
  const petits = cibles.filter(c => c.rayon < PETIT);
  const plusProche = (liste, max) => {
    let meilleur = null, dMin = max;
    for (const c of liste) { const d = distance(c); if (d <= dMin) { dMin = d; meilleur = c.code; } }
    return meilleur;
  };
  return plusProche(petits, RAYON_PETIT)
    ?? (cibles.find(c => c.contient(point)) || {}).code
    ?? plusProche(petits, RAYON_MIN);
}
