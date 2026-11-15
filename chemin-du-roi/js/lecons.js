// L'histoire et les leçons. Une étape est une phrase ({ dit }) ou un exercice ({ ex }).
// Types d'exercices : voir exercice.js. Les positions sont en FEN (les blancs en bas, c'est toujours l'enfant).

export const PERSONNAGES = {
  sage: { nom: 'Barnabé', image: 'img/sage.webp' },
  enfant: { nom: 'Léo', image: 'img/enfant.webp' },
  lina: { nom: 'Lina', image: 'img/lina.webp' },
  malo: { nom: 'Malo', image: 'img/malo.webp' },
  ines: { nom: 'Inès', image: 'img/ines.webp' },
  sacha: { nom: 'Sacha', image: 'img/sacha.webp' },
  yuna: { nom: 'Yuna', image: 'img/yuna.webp' },
};

const dit = (texte, qui) => ({ dit: texte, qui });

export const CHAPITRES = [
  {
    id: 'pieces', saison: 'automne', medaille: 1, qui: 'sage', titre: 'Les pièces', lieu: 'La maison de Barnabé', x: 34, y: 82, pied: [52, 88],
    lecons: [
      {
        id: 'tour', titre: 'La tour', piece: 'wr',
        etapes: [
          dit("Les échecs, c'est une bataille sur un plateau de 64 cases. Chaque pièce bouge à sa façon. On commence par la tour !"),
          { ...dit("La tour va tout droit : en avant, en arrière, à gauche, à droite, aussi loin qu'elle veut. Regarde les points : ce sont ses cases."), montre: 'a1' },
          dit("Oh non ! Le vent a secoué mon pommier, et les pommes ont roulé sur le plateau. Tu m'aides à les ramasser ?"),
          dit("D'accord ! Je vais remplir mon panier.", 'enfant'),
          { ex: { id: 'tour-1', type: 'etoiles', fen: '8/8/8/8/8/8/8/R7 w - -', etoiles: ['a6'], dit: "Touche la tour, puis va chercher la pomme." } },
          { ex: { id: 'tour-2', type: 'etoiles', fen: '8/8/8/8/3R4/8/8/8 w - -', etoiles: ['d8', 'h8'], dit: "Ramasse les deux pommes." } },
          { ex: { id: 'tour-3', type: 'etoiles', fen: '8/8/8/8/8/8/8/R7 w - -', etoiles: ['a8', 'h8', 'h1', 'e5'], dit: "Toutes les pommes, avec le moins de coups possible !" } },
          dit("Facile ! Je vais plus vite que le vent.", 'enfant'),
          dit("Attention : une pièce ne peut pas passer à travers une autre. Il faut faire le tour."),
          { ex: { id: 'tour-4', type: 'etoiles', fen: '8/8/8/8/P7/8/8/R1P5 w - -', etoiles: ['a6', 'c8'], dit: "Les pions te bloquent le chemin. Trouve un détour." } },
        ],
      },
      {
        id: 'fou', titre: 'Le fou', piece: 'wb',
        etapes: [
          { ...dit("Voici le fou. Il va en diagonale, en biais, aussi loin qu'il veut."), montre: 'c1' },
          { ex: { id: 'fou-1', type: 'etoiles', fen: '8/8/8/8/8/8/8/2B5 w - -', etoiles: ['h6'], dit: "Va chercher la pomme en diagonale." } },
          { ex: { id: 'fou-2', type: 'etoiles', fen: '8/8/8/8/8/8/8/2B5 w - -', etoiles: ['a3', 'f8'], dit: "Deux pommes maintenant." } },
          dit("Regarde bien : le fou reste toujours sur la même couleur de case. Un fou des cases claires, un fou des cases foncées."),
          { ex: { id: 'fou-3', type: 'etoiles', fen: '8/8/8/8/8/8/8/5B2 w - -', etoiles: ['b5', 'e8', 'h5', 'd3'], dit: "Toutes les pommes sont sur des cases claires. Ramasse-les !" } },
        ],
      },
      {
        id: 'dame', titre: 'La dame', piece: 'wq',
        etapes: [
          { ...dit("La dame, c'est la pièce la plus forte. Elle va comme la tour et comme le fou : tout droit et en diagonale."), montre: 'd1' },
          dit("Waouh, elle va partout !", 'enfant'),
          { ex: { id: 'dame-1', type: 'etoiles', fen: '8/8/8/8/8/8/8/3Q4 w - -', etoiles: ['d7', 'a4', 'h5'], dit: "Ramasse les pommes avec la dame." } },
          { ex: { id: 'dame-2', type: 'etoiles', fen: '8/8/8/8/2P5/8/1P6/Q7 w - -', etoiles: ['h8', 'a8', 'c6', 'g2'], dit: "Attention aux pions sur le chemin !" } },
        ],
      },
      {
        id: 'roi', titre: 'Le roi', piece: 'wk',
        etapes: [
          { ...dit("Voici le roi. C'est la pièce la plus importante, mais il marche lentement : une seule case, dans tous les sens."), montre: 'e1' },
          { ex: { id: 'roi-1', type: 'etoiles', fen: '8/8/8/8/8/8/8/4K3 w - -', etoiles: ['e2', 'f3', 'f4'], dit: "Un petit pas à la fois. Ramasse les pommes." } },
          { ex: { id: 'roi-2', type: 'etoiles', fen: '8/8/8/8/8/8/8/K7 w - -', etoiles: ['d4', 'b5'], dit: "Le roi part en promenade." } },
        ],
      },
      {
        id: 'cavalier', titre: 'Le cavalier', piece: 'wn',
        etapes: [
          { ...dit("Le cavalier est le plus rigolo. Il saute en forme de L : deux cases tout droit, puis une case sur le côté. Et lui seul peut sauter par-dessus les autres pièces !"), montre: 'b1' },
          { ex: { id: 'cavalier-1', type: 'etoiles', fen: '8/8/8/8/8/8/PPPPPPPP/1N6 w - -', etoiles: ['c3'], dit: "Saute par-dessus les pions jusqu'à la pomme." } },
          { ex: { id: 'cavalier-2', type: 'etoiles', fen: '8/8/8/8/8/8/8/6N1 w - -', etoiles: ['f3', 'e5', 'd7'], dit: "Trois sauts en L." } },
          { ex: { id: 'cavalier-3', type: 'etoiles', fen: '8/8/8/8/3N4/8/8/8 w - -', etoiles: ['d5', 'e4'], dit: "Plus difficile : ces pommes sont tout près, mais le cavalier ne va pas tout droit !" } },
        ],
      },
      {
        id: 'pion', titre: 'Le pion', piece: 'wp',
        etapes: [
          { ...dit("Le pion est le plus petit. Il avance tout droit et ne recule jamais. La première fois qu'il bouge, il peut avancer de deux cases d'un coup."), montre: 'e2' },
          { ex: { id: 'pion-1', type: 'etoiles', fen: '8/8/8/8/8/8/4P3/8 w - -', etoiles: ['e4'], dit: "Un seul coup pour aller à la pomme." } },
          { ex: { id: 'pion-2', type: 'etoiles', fen: '8/8/8/8/8/8/4P3/8 w - -', etoiles: ['e7'], dit: "Avance jusqu'à la pomme." } },
          dit("Le pion avance tout droit, mais il prend en diagonale, une case en biais. Prendre, c'est aller sur la case d'une pièce de l'autre couleur : elle sort du jeu."),
          { ex: { id: 'pion-3', type: 'prendre', fen: '8/8/6p1/4Pp2/4P3/8/8/8 w - -', dit: "Prends les pions noirs avec ton pion blanc." } },
          dit("Bravo Léo ! Tu connais toutes les pièces. Maintenant, va voir mes amis sur le chemin. Chacun va t'apprendre un secret."),
          dit("J'y vais ! À bientôt, Barnabé !", 'enfant'),
        ],
      },
    ],
  },
  {
    id: 'pions', saison: 'automne', medaille: 2, qui: 'lina', titre: 'La course des pions', lieu: 'Le potager de Lina', x: 30, y: 66, pied: [57, 73],
    lecons: [
      {
        id: 'promotion', titre: 'Le pion devient dame', piece: 'wq',
        etapes: [
          dit("Salut, moi c'est Lina ! Barnabé m'a dit que tu arrivais. Les pions, c'est mon truc. Tu sais le secret du pion ?", 'lina'),
          dit("Non, dis-moi !", 'enfant'),
          dit("Quand un pion arrive tout au bout du plateau, il se transforme ! Le plus souvent, on le change en dame.", 'lina'),
          { ex: { id: 'promo-1', type: 'etoiles', fen: '8/6P1/8/8/8/8/8/8 w - -', etoiles: ['g8', 'a2'], dit: "Mène le pion au bout, puis va chercher l'autre pomme avec ta nouvelle dame." } },
          { ex: { id: 'promo-2', type: 'prendre', fen: '1n6/P7/8/8/8/8/8/8 w - -', dit: "Prends le cavalier noir. Tu vas devoir te transformer pour ça !" } },
        ],
      },
      {
        id: 'en-passant', titre: 'Le coup secret', piece: 'wp',
        etapes: [
          dit("Je connais un coup secret : la prise en passant.", 'lina'),
          dit("Le pion noir vient d'avancer de deux cases pour passer à côté de ton pion. Ton pion peut le prendre quand même, comme s'il n'avait avancé que d'une case !", 'lina'),
          dit("Mais attention : c'est seulement tout de suite, juste après son coup.", 'lina'),
          { ex: { id: 'passant-1', type: 'coup', fen: '8/8/8/3pP3/8/8/8/8 w - d6', coups: ['e5d6'], dit: "Prends le pion noir en passant : va derrière lui, en diagonale." } },
        ],
      },
      {
        id: 'course', titre: 'La course contre Lina', piece: 'bp', partie: true,
        etapes: [
          dit("On fait la course ? Seulement des pions. Le premier qui amène un pion tout au bout a gagné !", 'lina'),
          dit("Petit conseil : un pion qui avance tout seul se fait prendre. Avance-les ensemble.", 'lina'),
          { ex: { id: 'course-1', type: 'partie', fin: 'course', fen: '8/2pppp2/8/8/8/8/2PPPP2/8 w - -', ami: 'lina', niveau: { prof: 2, hasard: 0.55, bruit: 90 }, dit: "Course à quatre pions. À toi de commencer !" } },
          dit("Encore une ! Cette fois, avec six pions.", 'lina'),
          { ex: { id: 'course-2', type: 'partie', fin: 'course', fen: '8/1pppppp1/8/8/8/8/1PPPPPP1/8 w - -', ami: 'lina', niveau: { prof: 2, hasard: 0.45, bruit: 80 }, dit: "La grande course !" } },
        ],
      },
    ],
  },
  {
    id: 'prises', saison: 'hiver', medaille: 3, qui: 'malo', titre: 'Le croque-pièces', lieu: 'La boulangerie de Malo', x: 66, y: 54, pied: [53, 59],
    lecons: [
      {
        id: 'croquer', titre: 'Tout croquer', piece: 'wr',
        etapes: [
          dit("Miam ! Moi c'est Malo. J'adore prendre les pièces, comme des gâteaux !", 'malo'),
          dit("Des gâteaux ? Moi aussi j'ai faim !", 'enfant'),
          dit("Les pièces noires ne bougent pas. Mange-les toutes, avec le moins de coups possible.", 'malo'),
          { ex: { id: 'croquer-1', type: 'prendre', fen: '4b3/8/8/p3n3/8/8/8/R7 w - -', dit: "La tour a faim." } },
          { ex: { id: 'croquer-2', type: 'prendre', fen: '8/8/8/8/2n5/8/1p2b3/3Q4 w - -', dit: "La dame a faim aussi." } },
          { ex: { id: 'croquer-3', type: 'prendre', fen: '8/3p4/5p2/8/4p3/2p5/8/1N6 w - -', dit: "Le cavalier saute de gâteau en gâteau." } },
        ],
      },
      {
        id: 'valeur', titre: 'La plus grosse part', piece: 'bq',
        etapes: [
          dit("Toutes les pièces ne valent pas pareil. Un pion vaut 1. Un cavalier ou un fou valent 3. Une tour vaut 5. La dame vaut 9 !", 'malo'),
          dit("Le roi, on ne le mange jamais : on l'attrape. Ça, Yuna te l'expliquera.", 'malo'),
          { ex: { id: 'valeur-1', type: 'prise', fen: '8/8/3q4/8/8/8/8/n2R4 w - -', dit: "Tu peux prendre le cavalier ou la dame. Prends la plus grosse part !" } },
          { ex: { id: 'valeur-2', type: 'prise', fen: '8/7p/5b2/2r5/4N3/8/8/8 w - -', dit: "Le cavalier peut prendre deux pièces. Laquelle vaut le plus ?" } },
          { ex: { id: 'valeur-3', type: 'prise', fen: '3r4/p5n1/8/8/3Q4/8/8/8 w - -', dit: "Que mange la dame ?" } },
        ],
      },
      {
        id: 'festin', titre: 'Le festin contre Malo', piece: 'bn', partie: true,
        etapes: [
          dit("On joue au festin ? Il n'y a pas de roi. Celui qui mange toutes les pièces de l'autre a gagné !", 'malo'),
          dit("Moi, je mange tout ce que je vois… Fais attention à ne pas me laisser des gâteaux !", 'malo'),
          { ex: { id: 'festin-1', type: 'partie', fin: 'tout', fen: '1n2r3/2ppp3/8/8/8/8/2PPP3/1N2R3 w - -', ami: 'malo', niveau: { prof: 1, hasard: 0.2, bruit: 120 }, dit: "Mange toutes les pièces de Malo." } },
        ],
      },
    ],
  },
  {
    id: 'pieges', saison: 'hiver', medaille: 4, qui: 'ines', titre: 'Gare aux pièges', lieu: 'La bibliothèque d\'Inès', x: 32, y: 43, pied: [48, 47],
    lecons: [
      {
        id: 'danger', titre: 'Les cases dangereuses', piece: 'wr',
        etapes: [
          dit("Bonjour, je suis Inès. Moi, avant de bouger, je regarde toujours avec ma loupe.", 'ines'),
          dit("Une case est dangereuse quand une pièce de l'autre couleur peut y aller. Si ta pièce s'y pose, elle se fait prendre.", 'ines'),
          dit("Les cases dangereuses sont marquées d'une croix rouge. Plus tard, tu devras les voir tout seul.", 'ines'),
          { ex: { id: 'danger-1', type: 'sauver', cible: 'e4', dangers: true, fen: '8/8/2b5/8/4R3/8/8/8 w - -', dit: "Le fou noir menace ta tour. Mets-la sur une case sans danger." } },
          { ex: { id: 'danger-2', type: 'sauver', cible: 'd4', dangers: true, fen: 'r6b/8/8/5n2/3Q4/8/8/8 w - -', dit: "Ta dame est menacée deux fois ! Trouve-lui une case tranquille." } },
          { ex: { id: 'danger-3', type: 'sauver', cible: 'c4', fen: '8/8/8/1p6/2N5/8/8/3r4 w - -', dit: "Sans les croix, maintenant. Ton cavalier est-il en sécurité ? Sauve-le." } },
        ],
      },
      {
        id: 'gateau-piege', titre: 'Le gâteau piégé', piece: 'bp',
        etapes: [
          dit("Malo prend tout ce qu'il voit. Mais parfois, une pièce est gardée : si tu la prends, on te reprend !", 'ines'),
          dit("Avant de prendre, demande-toi : après, est-ce qu'on peut me prendre ?", 'ines'),
          { ex: { id: 'piege-1', type: 'prise', fen: '4b3/3r4/8/8/n7/8/8/3Q4 w - -', dit: "La tour est gardée par le fou. Que vaut-il mieux prendre ?" } },
          { ex: { id: 'piege-2', type: 'prise', fen: '8/8/3p3p/4p1r1/3b4/5N2/8/8 w - -', dit: "Le cavalier peut prendre trois pièces. Une seule est un bon gâteau." } },
          { ex: { id: 'piege-3', type: 'prise', fen: '8/8/2p5/3r4/8/7n/8/3Q2N1 w - -', dit: "Prends sans te faire reprendre." } },
        ],
      },
    ],
  },
  {
    id: 'echec', saison: 'printemps', medaille: 5, qui: 'sacha', titre: 'Échec au roi', lieu: 'La maison de Sacha', x: 68, y: 35, pied: [56, 40],
    lecons: [
      {
        id: 'donner', titre: 'Faire échec', piece: 'wn',
        etapes: [
          dit("Salut Léo, moi c'est Sacha ! Tu sais pourquoi le roi est si important ?", 'sacha'),
          dit("Parce que c'est le chef ?", 'enfant'),
          dit("Quand une pièce attaque le roi, on dit « échec ! ». Le roi doit tout de suite se sauver.", 'sacha'),
          { ex: { id: 'donner-1', type: 'echec', fen: '4k3/8/8/8/8/8/8/R3K3 w - -', dit: "Fais échec au roi noir avec ta tour." } },
          { ex: { id: 'donner-2', type: 'echec', fen: '4k3/8/8/8/4N3/8/8/4K3 w - -', dit: "Fais échec avec ton cavalier." } },
          { ex: { id: 'donner-3', type: 'echec', fen: '4k3/8/8/8/8/8/8/4KB2 w - -', dit: "Fais échec avec ton fou." } },
        ],
      },
      {
        id: 'parer', titre: 'Se sauver', piece: 'wk',
        etapes: [
          dit("Maintenant, c'est ton roi qui est en échec ! Il y a trois façons de le sauver.", 'sacha'),
          dit("Un : déplacer le roi sur une case où il n'est plus attaqué.", 'sacha'),
          { ex: { id: 'parer-1', type: 'parer', facon: 'roi', fen: '4k3/8/8/4r3/8/8/8/4K3 w - -', dit: "La tour noire attaque ton roi. Bouge-le !" } },
          dit("Deux : prendre la pièce qui attaque.", 'sacha'),
          { ex: { id: 'parer-2', type: 'parer', facon: 'prendre', fen: '4k3/8/8/4r3/6N1/8/8/4K3 w - -', dit: "Prends la tour qui attaque ton roi." } },
          dit("Trois : mettre une pièce entre le roi et l'attaquant, comme un bouclier.", 'sacha'),
          { ex: { id: 'parer-3', type: 'parer', facon: 'bloquer', fen: 'k3r3/8/8/8/8/8/3B4/4K3 w - -', dit: "Protège ton roi avec ton fou." } },
          dit("Et une règle d'or : on n'a jamais le droit de laisser son roi en échec. Ni d'aller se mettre en échec !", 'sacha'),
          { ex: { id: 'parer-4', type: 'parer', fen: '6k1/3R4/8/8/8/8/5PPP/r5K1 w - -', dit: "Échec ! Ton roi est coincé. Comment le sauver ?" } },
        ],
      },
    ],
  },
  {
    id: 'mat', saison: 'printemps', medaille: 6, qui: 'yuna', titre: 'Échec et mat', lieu: 'Le fort de Yuna', x: 32, y: 25, pied: [47, 30],
    lecons: [
      {
        id: 'mat-1', titre: 'Le premier mat', piece: 'bk',
        etapes: [
          dit("Bonjour Léo. Je suis Yuna. Je vais t'apprendre à gagner.", 'yuna'),
          dit("Quand le roi est en échec et qu'il ne peut plus se sauver d'aucune façon, c'est « échec et mat ». La partie est finie : tu as gagné !", 'yuna'),
          { ex: { id: 'mat-a', type: 'mat', fen: '6k1/5ppp/8/8/8/8/8/R5K1 w - -', dit: "Le roi noir est coincé derrière ses pions. Fais échec et mat en un coup." } },
          { ex: { id: 'mat-b', type: 'mat', fen: '7k/8/6K1/8/8/8/8/R7 w - -', dit: "Ton roi aide ta tour. Échec et mat !" } },
          { ex: { id: 'mat-c', type: 'mat', fen: '6k1/1R6/8/8/8/8/8/R5K1 w - -', dit: "Deux tours, comme une échelle." } },
          { ex: { id: 'mat-d', type: 'mat', fen: 'k7/7Q/1K6/8/8/8/8/8 w - -', dit: "La dame vient tout près, protégée par ton roi." } },
        ],
      },
      {
        id: 'mat-2', titre: 'Les mats malins', piece: 'bk',
        etapes: [
          dit("Attention à un piège : si le roi n'est pas en échec mais qu'il ne peut plus bouger du tout, c'est « pat ». Personne ne gagne !", 'yuna'),
          { ex: { id: 'mat-e', type: 'mat', fen: '6rk/6pp/8/6N1/8/8/8/6K1 w - -', dit: "Le roi est étouffé par ses propres pièces. Ton cavalier peut finir le travail." } },
          { ex: { id: 'mat-f', type: 'mat', fen: '6k1/5ppp/8/8/8/8/1B6/6QK w - -', dit: "Ta dame et ton fou travaillent ensemble." } },
          { ex: { id: 'mat-g0', type: 'mat', fen: '6k1/pp3ppp/2p5/8/8/2N5/PPP2PPP/3R2K1 w - -', dit: "Plus de pièces maintenant. Le roi noir est encore coincé derrière ses pions…" } },
          { ex: { id: 'mat-g', type: 'mat', fen: 'r1bqkbnr/pppp1ppp/2n5/4p3/2B1P3/5Q2/PPPP1PPP/RNB1K1NR w KQkq -', dit: "Un vrai début de partie ! Trouve le mat du berger." } },
          { ex: { id: 'mat-h', type: 'mat', fen: '1k6/ppp5/8/8/8/8/5PPP/3R2K1 w - -', dit: "Dernier mat. Regarde bien les cases autour du roi noir." } },
        ],
      },
    ],
  },
  {
    id: 'tour-finale', saison: 'ete', medaille: 7, qui: 'sage', titre: 'La vraie partie', lieu: 'La tour du château', x: 50, y: 12, pied: [52, 19],
    lecons: [
      {
        id: 'roque', titre: 'Le roque', piece: 'wk',
        etapes: [
          dit("Barnabé ! J'ai rencontré tous tes amis !", 'enfant'),
          dit("Je sais, Léo, ils m'ont tout raconté. Il reste un dernier coup spécial : le roque."),
          dit("Le roi va de deux cases vers sa tour, et la tour saute de l'autre côté du roi. Comme ça, le roi est à l'abri dans un coin."),
          dit("On peut roquer seulement si le roi et la tour n'ont jamais bougé, s'il n'y a rien entre eux, et si le roi n'est pas en échec."),
          { ex: { id: 'roque-1', type: 'coup', fen: 'r3k2r/pppppppp/8/8/8/8/PPPPPPPP/R3K2R w KQkq -', coups: ['e1g1', 'e1c1'], dit: "Roque ! Touche ton roi et fais-le glisser de deux cases vers une tour." } },
          dit("Au début d'une partie, sors tes cavaliers et tes fous, prends le centre, et roque tôt. Tu es prêt, Léo ! Mes amis t'attendent pour de vraies parties. Et à la fin… c'est contre moi !"),
        ],
      },
      {
        id: 'parties', titre: 'Jouer avec les amis', piece: 'wk', parties: true,
        etapes: [],
      },
    ],
  },
];

// Les vraies parties, de la plus facile à la plus difficile.
export const AMIS = [
  { qui: 'lina', niveau: { prof: 1, hasard: 0.6, bruit: 200 }, mot: "Je débute aussi, on s'amuse !" },
  { qui: 'malo', niveau: { prof: 1, hasard: 0.25, bruit: 120 }, mot: "Je vais tout manger !" },
  { qui: 'ines', niveau: { prof: 2, hasard: 0.15, bruit: 90 }, mot: "Je regarde où sont les pièges." },
  { qui: 'sacha', niveau: { prof: 2, hasard: 0.05, bruit: 50 }, mot: "Mes cavaliers vont te surprendre." },
  { qui: 'yuna', niveau: { prof: 2, hasard: 0, bruit: 20 }, mot: "Je cherche toujours le mat." },
  { qui: 'sage', niveau: { prof: 3, hasard: 0, bruit: 15 }, mot: "Montre-moi tout ce que tu as appris." },
];

// La médaille 8 : avoir battu Barnabé.
export const MEDAILLE_FINALE = 8;

export const DEPART = 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq -';

// Toutes les leçons dans l'ordre, avec leur chapitre.
export const LECONS = CHAPITRES.flatMap(c => c.lecons.map(l => ({ ...l, chapitre: c.id, qui: l.qui || c.qui })));
