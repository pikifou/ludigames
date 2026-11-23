// Les Défis de Barnabé : l'histoire, les lieux, les bouteilles et leurs défis.
// Une étape est une phrase ({ dit }) ou un défi ({ ex }). Les positions viennent de defis.js (fabriqué par tools/defis.js).
// Les blancs, en bas, c'est toujours Léo.
import { DEFIS } from './defis.js';

export const PERSONNAGES = {
  sage: { nom: 'Barnabé', image: 'img/sage.webp' },
  enfant: { nom: 'Léo', image: 'img/enfant.webp' },
};

const dit = (texte, qui) => ({ dit: texte, qui });

// Ce que Barnabé demande, selon le défi.
const CONSIGNE = {
  prise: "Une pièce noire n'est pas protégée. Prends-la !",
  sauver: "Ta pièce qui brille en rouge est attaquée. Mets-la à l'abri !",
  echec: "Trouve un coup qui fait échec au roi noir.",
  parer: "Ton roi est en échec ! Sauve-le en prenant la pièce qui l'attaque.",
  mat: "Fais échec et mat en un seul coup !",
  fourchette: "Trouve le coup qui attaque deux pièces à la fois, sur une case où on ne peut pas te prendre.",
  parade: "Regarde la pièce rouge : elle menace de faire mat ! Trouve le coup qui protège ton roi.",
};

// Une bouteille : quelques phrases, puis ses cinq défis.
function bouteille(id, titre, piece, phrases, consigne = null, extra = {}) {
  const defis = DEFIS[id];
  if (!defis) throw new Error('bouteille inconnue : ' + id);
  return {
    id, titre, piece: 'bouteille', // sur la liste, chaque défi est une bouteille à ouvrir
    etapes: [
      ...phrases,
      ...defis.map((d, k) => ({ ex: { ...d, ...extra, id: `${id}-${k + 1}`, dit: (typeof consigne === 'function' ? consigne(d, k) : consigne) || CONSIGNE[d.type] } })),
    ],
  };
}

export const CHAPITRES = [
  {
    id: 'plage', saison: 'plage', musique: 'plage', medaille: 1, qui: 'sage', titre: 'Ce qui traîne', lieu: 'La plage', x: 22, y: 80, pied: [38, 90],
    lecons: [
      bouteille('plage-1', 'Une pièce toute seule', 'wq', [
        dit("Voici ma première bouteille, Léo ! Dedans, il y a un défi."),
        dit("Une pièce noire est toute seule : personne ne la protège. Une pièce qui traîne, on la prend !"),
      ], "Cette pièce noire n'est pas protégée. Prends-la !"),
      bouteille('plage-2', 'Le bon choix', 'wr', [
        dit("Plus difficile : maintenant, il y a deux pièces à prendre. L'une est protégée, l'autre non."),
        dit("Si tu prends la pièce protégée, on te reprend ta pièce. Prends seulement celle qui est gratuite !"),
      ], "Une seule pièce noire est gratuite. Laquelle ?"),
      bouteille('plage-3', 'Comme en vraie partie', 'wn', [
        dit("Ces positions viennent de vraies parties. Il y a beaucoup de pièces, alors regarde bien partout."),
      ], "Une pièce noire traîne quelque part. Prends-la sans te faire reprendre !"),
    ],
  },
  {
    id: 'port', saison: 'port', musique: 'plage', medaille: 2, qui: 'sage', titre: 'À l\'abri', lieu: 'Le port', x: 76, y: 71, pied: [37, 77],
    lecons: [
      bouteille('port-1', 'Sauve ta pièce', 'wb', [
        dit("Au port, quand la tempête arrive, les bateaux se mettent à l'abri. Tes pièces aussi !"),
        dit("Quand une pièce noire attaque la tienne, mets-la sur une case où personne ne peut la prendre. Les croix rouges montrent les cases dangereuses."),
      ], "Ta pièce qui brille en rouge est attaquée. Mets-la à l'abri, loin des croix !", { dangers: true }),
      bouteille('port-2', 'Sans les croix', 'wn', [
        dit("Cette fois, je ne montre plus les croix. C'est à toi de voir où sont les dangers."),
      ], "Ta pièce qui brille en rouge est attaquée. Trouve-lui une case tranquille."),
      bouteille('port-3', 'Comme en vraie partie', 'wq', [
        dit("En vraie partie, il faut d'abord remarquer qu'une pièce est en danger. Je te la montre encore, en rouge."),
      ], "Ta pièce en rouge va se faire prendre. Sauve-la !"),
    ],
  },
  {
    id: 'dunes', saison: 'dunes', musique: 'plage', medaille: 3, qui: 'sage', titre: 'Échec !', lieu: 'Les dunes', x: 16, y: 54, pied: [33, 64],
    lecons: [
      bouteille('dunes-1', 'Attaque le roi', 'wr', [
        dit("Dans les dunes, on s'entraîne à attaquer le roi. Faire échec, c'est attaquer le roi noir avec une de tes pièces."),
      ], "Trouve un coup qui fait échec au roi noir."),
      bouteille('dunes-2', 'Prends l\'attaquant', 'wk', [
        dit("Et quand c'est ton roi qui est en échec ? Il y a trois façons de le sauver : le bouger, mettre une pièce devant, ou prendre l'attaquant."),
        dit("Aujourd'hui, on prend l'attaquant : c'est souvent le meilleur !"),
      ], "Ton roi est en échec ! Sauve-le en prenant la pièce qui l'attaque."),
      bouteille('dunes-3', 'Comme en vraie partie', 'wq', [
        dit("Maintenant, des positions de vraies parties. Il y a toujours un échec à trouver."),
      ], "Trouve un coup qui fait échec au roi noir."),
    ],
  },
  {
    id: 'rochers', saison: 'rochers', musique: 'rochers', medaille: 4, qui: 'sage', titre: 'Mat en un', lieu: 'Les rochers', x: 66, y: 44, pied: [45, 52],
    lecons: [
      bouteille('rochers-1', 'Avec la dame', 'wq', [
        dit("Sur les rochers, le roi noir est coincé, comme un crabe au fond d'une flaque !"),
        dit("Échec et mat : le roi est attaqué et il ne peut plus s'échapper. Trouve le mat en un seul coup."),
      ], "Le roi noir est au bord. Fais échec et mat avec ta dame !"),
      bouteille('rochers-2', 'Le couloir', 'wr', [
        dit("Un roi caché derrière ses pions n'a pas de sortie. Une tour sur sa ligne, et c'est mat : on appelle ça le mat du couloir."),
      ], "Le roi noir est enfermé derrière ses pions. Trouve le mat !"),
      bouteille('rochers-3', 'Comme en vraie partie', 'wk', [
        dit("Dans ces vraies parties, il y a un mat en un coup. Regarde chaque échec possible, un par un."),
      ], "Il y a un échec et mat en un coup. Trouve-le !"),
    ],
  },
  {
    id: 'cabanes', saison: 'cabanes', musique: 'rochers', medaille: 5, qui: 'sage', titre: 'La fourchette', lieu: 'Les cabanes', x: 22, y: 30, pied: [35, 40],
    lecons: [
      bouteille('cabanes-1', 'Le cavalier pêcheur', 'wn', [
        dit("Les pêcheurs attrapent deux poissons d'un coup avec leur fourche. Aux échecs aussi !"),
        dit("Une fourchette, c'est attaquer deux pièces à la fois. L'autre ne peut en sauver qu'une. Le cavalier est le champion des fourchettes."),
      ], "Saute avec ton cavalier pour attaquer deux pièces à la fois."),
      bouteille('cabanes-2', 'Toutes les pièces', 'wq', [
        dit("Toutes les pièces peuvent faire une fourchette : la dame, le fou, même un petit pion !"),
      ], "Trouve le coup qui attaque deux pièces à la fois, sur une case où on ne peut pas te prendre."),
      bouteille('cabanes-3', 'Comme en vraie partie', 'wn', [
        dit("Les fourchettes se cachent dans les vraies parties. Cherche une case d'où ta pièce attaque deux pièces."),
      ], "Une fourchette se cache ici. Trouve-la !"),
    ],
  },
  {
    id: 'jetee', saison: 'jetee', musique: 'rochers', medaille: 6, qui: 'sage', titre: 'Attention au mat !', lieu: 'La jetée', x: 76, y: 25, pied: [42, 30],
    lecons: [
      bouteille('jetee-1', 'Le couloir de ton roi', 'wk', [
        dit("Sur la jetée, on regarde loin, vers la mer. Aux échecs aussi : avant de jouer, regarde toujours ce que l'autre veut faire !"),
        dit("Ici, c'est moi qui menace de faire mat. Je te montre ma pièce en rouge. Trouve le coup qui protège ton roi."),
      ]),
      bouteille('jetee-2', 'Plus de pièces', 'wr', [
        dit("Même chose, avec plus de pièces autour. Pense à faire une sortie pour ton roi, ou à bloquer la ligne."),
      ]),
      bouteille('jetee-3', 'Le grand mélange', 'wq', [
        dit("Dernière bouteille : un peu de tout, comme dans une vraie partie. Lis bien ce que je demande à chaque fois !"),
      ], d => CONSIGNE[d.type]),
    ],
  },
  {
    id: 'phare', saison: 'phare', musique: 'phare', medaille: 7, qui: 'sage', titre: 'Le match', lieu: 'Le phare', x: 68, y: 8, pied: [40, 18],
    lecons: [
      {
        id: 'avant-match', titre: 'Avant le match', piece: 'wk',
        etapes: [
          dit("Barnabé ! J'ai ouvert toutes tes bouteilles !", 'enfant'),
          dit("Je les ai vues, Léo. Tu prends ce qui traîne, tu mets tes pièces à l'abri, tu trouves les mats et les fourchettes. Bravo !"),
          dit("Le phare s'allume ce soir. C'est le moment de notre match. Cette fois, je joue un peu plus fort, mais je te préviendrai encore si tu fais une grosse étourderie."),
        ],
      },
      { id: 'match', titre: 'Le match contre Barnabé', piece: 'wk', parties: true, etapes: [] },
    ],
  },
];

// Le seul qu'on affronte : Barnabé, un peu plus fort que dans Le Chemin du Roi (il y jouait à hasard 0,2 et bruit 90).
export const AMIS = [
  { qui: 'sage', niveau: { prof: 1, hasard: 0.12, bruit: 70 }, mot: "Montre-moi tout ce que mes bouteilles t'ont appris ! Je te préviendrai si tu fais une grosse étourderie." },
];

// La médaille 7 : avoir battu Barnabé au phare.
export const MEDAILLE_FINALE = 7;

export const DEPART = 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq -';

export const LECONS = CHAPITRES.flatMap(c => c.lecons.map(l => ({ ...l, chapitre: c.id, qui: l.qui || c.qui })));
