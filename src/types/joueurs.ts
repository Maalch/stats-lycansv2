export interface Player {
  Joueur: string;
  SteamID: string | null; 
  Image: string | null;
  Twitch: string | null;
  Youtube: string | null;
  Couleur: string | null;
}

export interface JoueursData {
  TotalRecords: number;
  Players: Player[];
}