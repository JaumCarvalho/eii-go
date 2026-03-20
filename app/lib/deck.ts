export type CardType =
  | "tempura"
  | "sashimi"
  | "dumpling"
  | "maki_1"
  | "maki_2"
  | "maki_3"
  | "salmon_nigiri"
  | "squid_nigiri"
  | "egg_nigiri"
  | "pudding"
  | "wasabi"
  | "chopsticks";

export interface Card {
  id: string;
  type: CardType;
}

const generateId = () => Math.random().toString(36).substring(2, 15);

export function createShuffledDeck(): Card[] {
  const deck: Card[] = [];

  const addCards = (type: CardType, quantity: number) => {
    for (let i = 0; i < quantity; i++) {
      deck.push({ id: generateId(), type });
    }
  };

  addCards("tempura", 14);
  addCards("sashimi", 14);
  addCards("dumpling", 14);
  addCards("maki_2", 12);
  addCards("maki_3", 8);
  addCards("maki_1", 6);
  addCards("salmon_nigiri", 10);
  addCards("squid_nigiri", 5);
  addCards("egg_nigiri", 5);
  addCards("pudding", 10);
  addCards("wasabi", 6);
  addCards("chopsticks", 4);

  for (let i = deck.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [deck[i], deck[j]] = [deck[j], deck[i]];
  }

  return deck;
}
