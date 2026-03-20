export type Card = { id: string; type: string };

export type PlayerData = {
  id: string;
  nome: string;
  avatar: string;
  has_picked?: boolean;
  score?: number;
};

export type OccupiedSeat = {
  position: string;
  id: string;
  player: PlayerData;
};
