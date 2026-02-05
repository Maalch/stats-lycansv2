export const APP_VERSION = '1.7.4';

// Changelog data
export interface ChangelogEntry {
  version: string;
  date: string;
  description: string;
  link?: {
    mainTab: string;
    subTab?: string;
    text: string; // The text to make clickable (e.g., "Joueurs / Séries")
    navigationState?: Record<string, any>; // Additional navigation state to set
  };
}

export const CHANGELOG: ChangelogEntry[] = [
  {
    version: 'v1.7.4',
    date: '05/02/2026',
    description: 'Ajout de statistiques sur les Actions en parties moddées (impact des gadgets, potions et timing de transformation des loups) dans',
    link: {
      mainTab: 'general',
      subTab: 'actionMeta',
      text: 'Stats Parties / Actions (Gadgets & Potions)'
    }
  },
  {
    version: 'v1.7.3',
    date: '03/02/2026',
    description: 'Ajout de deux nouvelles séries : "Série sans Survivre" (morts consécutives) et "Série Survivant" (survies consécutives) dans',
    link: {
      mainTab: 'rankings',
      subTab: 'series',
      text: 'Classements / Séries',
      navigationState: {
        selectedSeriesType: 'deaths'
      }
    }
  },
  {
    version: 'v1.7.2',
    date: '31/01/2026',
    description: 'Ajout de statistiques sur les records de kills en une partie/nuit dans',
    link: {
      mainTab: 'rankings',
      subTab: 'deathStats',
      text: 'Classements / Morts & Kills'
    }
  },
  {
    version: 'v1.7.1',
    date: '23/01/2026',
    description: 'Ajout de titres sur la page des joueurs dans',
    link: {
      mainTab: 'playerSelection',
      text: 'Joueur / Titres',
      navigationState: {
        selectedPlayerSelectionView: 'titles'
      }
    }
  },
  {
    version: 'v1.6.6',
    date: '23/01/2026',
    description: 'Ajout de la possibilité de selectionner 2 joueurs dans',
    link: {
      mainTab: 'rankings',
      subTab: 'pairing',
      text: 'Classements / Paires de Joueurs',
    }
  },
  {
    version: 'v1.6.5',
    date: '23/01/2026',
    description: 'Ajout de statistiques sur Timings de votes (premiers / derniers voteurs) dans',
    link: {
      mainTab: 'rankings',
      subTab: 'votingStats',
      text: 'Classements / Votes / Timing de Vote',
      navigationState: {
        votingStatsState: {
          selectedCategory: 'timing'
        }
      }
    }
  },
  {
    version: 'v1.6.4',
    date: '19/01/2026',
    description: 'Ajout d\'une page d\'évolution globale des parties (nombre de parties, taux de victoire par camp, joueurs moyens, durée) dans',
    link: {
      mainTab: 'general',
      subTab: 'evolution',
      text: 'Stats Parties / Évolution'
    }
  },
  {
    version: 'v1.6.3',
    date: '31/12/2025',
    description: 'Ajout d\'une page sur le temps de parole individuel dans',
    link: {
      mainTab: 'playerSelection',
      subTab: 'talkingTime',
      text: 'Joueur / Parole',
      navigationState: {
        selectedPlayerSelectionView: 'talkingtime'
      }
    }
  },
  {
    version: 'v1.6.2',
    date: '30/12/2025',
    description: 'Ajout d\'une page sur les données de récolte individuelle dans',
    link: {
      mainTab: 'lootStats',
      text: 'Statistiques de Récolte'
    }
  },
  {
    version: 'v1.6.1',
    date: '29/12/2025',
    description: 'Ajout d\'une page dédiée aux Clips Twitch dans',
    link: {
      mainTab: 'clips',
      text: 'Clips'
    }
  },
  {
    version: 'v1.5.3',
    date: '12/12/2025',
    description: 'Ajout du % d\'apparition par camp et rôle dans',
    link: {
      mainTab: 'rankings',
      subTab: 'campStats',
      text: 'Classements / Camps et Rôles',
    }
  },
  {
    version: 'v1.5.2',
    date: '05/12/2025',
    description: 'Ajout du détails des parties par composition Loups/Solos/Villageois dans',
    link: {
      mainTab: 'general',
      subTab: 'teamComposition',
      text: 'Stats Parties / Compositions',
    }
  },
  {
    version: 'v1.5.1',
    date: '27/11/2025',
    description: 'Ajouts des cartes de kills par joueur dans',
    link: {
      mainTab: 'playerSelection',
      subTab: 'heatmap',
      text: 'Joueur / Carte',
      navigationState: {
        selectedPlayerSelectionView: 'deathmap'
      }
    }
  },
  {
    version: 'v1.5.1',
    date: '27/11/2025',
    description: 'Ajouts des cartes de kills générales dans',
    link: {
      mainTab: 'general',
      subTab: 'heatmap',
      text: 'Stats Parties / Heatmap'
    }
  },
  {
    version: 'v1.4.4',
    date: '18/11/2025',
    description: 'Ajouts du nombre de kills dans',
    link: {
      mainTab: 'rankings',
      subTab: 'comparison',
      text: 'Classements / Face à Face'
    }
  },
  {
    version: 'v1.4.3',
    date: '14/11/2025',
    description: 'Ajouts de statistiques sur les temps de paroles (depuis la 0.215) dans',
    link: {
      mainTab: 'rankings',
      subTab: 'talkingTime',
      text: 'Classements / Temps de Parole'
    }
  },
  {
    version: 'v1.4.2',
    date: '14/11/2025',
    description: 'Ajouts de statistiques générales sur les métiers, pouvoirs et rôles secondaires dans',
    link: {
      mainTab: 'general',
      subTab: 'rolesStats',
      text: 'Stats Parties / Rôles'
    }
  },
  {
    version: 'v1.4.1',
    date: '13/11/2025',
    description: 'Ajouts de statistiques individuelles sur les métiers, pouvoirs et rôles secondaires dans',
    link: {
      mainTab: 'playerSelection',
      text: 'Joueur / Rôles',
      navigationState: {
        selectedPlayerSelectionView: 'roles'
      }
    }
  },
  {
    version: 'v1.3.15',
    date: '06/11/2025',
    description: 'Ajouts d\'une série "Rôles solo" dans',
    link: {
      mainTab: 'rankings',
      subTab: 'series',
      text: 'Classements / Séries / Rôles solo',
      navigationState: {
        selectedSeriesType: 'solo'
      }
    }
  },
  {
    version: 'v1.3.14',
    date: '05/11/2025',
    description: 'Ajouts de graphiques sur les Couleurs, dans',
    link: {
      mainTab: 'general',
      subTab: 'colorStats',
      text: 'Stats Parties / Couleurs'
    }
  },
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
    description: 'Ajout d\'un graphique "Types de Mort les Plus Fréquents" dans "Joueur" / "Kills".\nAjout du total du temps de jeu dans "Statistiques Générales" / "Durée des Parties" et dans par joueur "Evolution".',
  },
  {
    version: 'v1.3.9',
    date: '24/10/2025',
    description: 'Dans "Evolution", ajout de la possibilité de trier par Trimestre/année et par camp.\n Dans "Classements" / "Séries", ajout d\'un bouton pour voir uniquement les séries actives ou non.',
  },
  {
    version: 'v1.3.8',
    date: '23/10/2025',
    description: 'Réorganisation des pages du joueurs : les données précédemment disponibles dans "Historique Joueur" sont maintenant disponible dans la "Joueur".\n+ Beaucoup de petites clarifications sur des titres et descriptions des graphiques.',
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