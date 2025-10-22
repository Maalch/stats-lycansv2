export interface Player {
  Joueur: string;
  ID: string; // Steam ID
  Image: string | null;
  Twitch: string | null;
  Youtube: string | null;
  Couleur: string | null;
}

export interface JoueursData {
  TotalRecords: number;
  Players: Player[];
}