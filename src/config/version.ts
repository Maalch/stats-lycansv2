export const APP_VERSION = '1.3.13';

// Changelog data
export interface ChangelogEntry {
  version: string;
  date: string;
  description: string;
}

export const CHANGELOG: ChangelogEntry[] = [
  {
    version: 'v1.3.13',
    date: '05/11/2025',
    description: 'Amélioration de la partie Battle Royale: ajout du classement par victoire et répartition par nombre de kills du gagnant',
  },
  {
    version: 'v1.3.12',
    date: '05/11/2025',
    description: 'Ajout d\'une médaille "Bon Chasseur" et d\'un classement "Mauvais Chasseur". Gestion des kills en Chasseur sur "Idiot du Village" après la 0.202 comme "Mauvais Chasseur".',
  },
  {
    version: 'v1.3.11',
    date: '03/11/2025',
    description: 'Ajout de VODs de différents joueurs dans "Détails des Parties".',
  },
  {
    version: 'v1.3.10',
    date: '30/10/2025',
    description: 'Ajout d\'un graphique "Types de Mort les Plus Fréquents" dans "Sélection Joueurs" / "Kills".\nAjout du total du temps de jeu dans "Statistiques Générales" / "Durée des Parties" et dans par joueur "Evolution".',
  },
  {
    version: 'v1.3.9',
    date: '24/10/2025',
    description: 'Dans "Evolution", ajout de la possibilité de trier par Trimestre/année et par camp.\n Dans "Joueurs" / "Séries", ajout d\'un bouton pour voir uniquement les séries actives ou non.',
  },
  {
    version: 'v1.3.8',
    date: '23/10/2025',
    description: 'Réorganisation des pages du joueurs : les données précédemment disponibles dans "Historique Joueur" sont maintenant disponible dans la "Sélection Joueur".\n+ Beaucoup de petites clarifications sur des titres et descriptions des graphiques.',
  },
    {
    version: 'v1.3.7',
    date: '16/10/2025',
    description: 'Ajout des joueurs les plus tués et des joueurs qui vous ont le plus tué dans l\'historique des parties d\'un joueur (dans "Joueurs" / "Historique Joueur").',
  },
  {
    version: 'v1.3.6',
    date: '15/10/2025',
    description: 'Ajout de tant attendu "Taux de Survie par Jour" (dans "Joueurs" / "Mort & Kills" / "Survie"). Et non, Ponce est loin d\'être le pire...',
  },
  {
    version: 'v1.3.5',
    date: '14/10/2025',
    description: 'Ajout de stats sur les votes (dans "Joueurs" / "Votes" et "Parties" / "Votes").',
  },
  {
    version: 'v1.3.4',
    date: '10/10/2025',
    description: 'Ajout du graphique "Série de games sans être Loup" (dans "Joueurs" / "Séries").',
  },
  {
    version: 'v1.3.3',
    date: '08/10/2025',
    description: 'Nouveau look pour la page de sélection des joueurs ! Affichage des vignettes des joueurs, avec lien Twitch et Youtube si disponibles.',
  },
  {
    version: 'v1.3.2',
    date: '08/10/2025',
    description: 'Ajout de statistiques sur la durée en "temps de jeu" (dans "Parties" / "Durée des Parties")',
  },
  {
    version: 'v1.3.1',
    date: '07/10/2025',
    description: 'Détails des bons et mauvais chasseurs (dans Joueurs / Morts & Kills)',
  },
  {
    version: 'v1.3.0',
    date: '03/10/2025',
    description: 'Nouvelle page d\'accueil avec classement globaux !\nRaccourci vers les différents graphiques depuis la page d\'accueil',
  },
  {
    version: 'v1.2.2',
    date: '01/10/2025',
    description: 'Ajout du numéro de version et de la page des changements'
  },
  {
    version: 'v1.2.1',
    date: '30/09/2025',
    description: 'Correction du camp Vaudou / Zombie dans le graphique des Kills'
  },
  {
    version: 'v1.2.0',
    date: '25/09/2025',
    description: 'Ajout des graphiques "Morts & Kills" (dans "Joueurs")'
  },
  {
    version: 'v1.1.3',
    date: '24/09/2025',
    description: 'Ajout des taux de victoire par Map dans "Joueurs" / "Historique Joueur"'
  },
  {
    version: 'v1.1.2',
    date: '22/09/2025',
    description: 'Amélioration de la lisibilité des joueurs mis en avant dans les graphiques'
  },
  {
    version: 'v1.1.1',
    date: '21/09/2025',
    description: 'Ajout des graphiques "Camp" / "Types de Victoire"'
  },
  {
    version: 'v1.1.0',
    date: '19/09/2025',
    description: 'Ajout du filtre "Joueur mis en avant", pour voir un joueur en particulier dans tous les graphiques du site. Refonte des "Paramètres" en "Filtre".'
  },
  {
    version: 'v1.0.0',
    date: '18/08/2025',
    description: 'Publication du site'
  }
];