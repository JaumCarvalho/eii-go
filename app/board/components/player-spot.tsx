import type { Card } from "../types";
import { CARD_DICT } from "../constants";

interface PlayerSpotProps {
  id: string;
  name: string;
  avatar: string;
  position: string;
  isMainPlayer: boolean;
  pickStatus: boolean;
  cardCount: number;
  tableCards: Card[];
}

export function PlayerSpot({
  id,
  name,
  avatar,
  position,
  isMainPlayer,
  pickStatus,
  cardCount,
  tableCards,
}: PlayerSpotProps) {
  const isWaiting = isMainPlayer ? "Aguardando..." : "Pronto!";
  const isChoosing = isMainPlayer ? "ESCOLHA 1 CARTA" : "Escolhendo...";
  const badgeColor = pickStatus
    ? "var(--wasabi-green)"
    : isMainPlayer
      ? "var(--salmon-pink)"
      : "var(--tamago-yellow)";

  return (
    <div
      className={`player-spot spot-${position} ${isMainPlayer ? "main-player" : ""}`}
      id={id}
    >
      {!isMainPlayer && (
        <div className="player-info">
          <p className="nickname">{name}</p>
          <div className="avatar-small">
            <img src={avatar} alt="Avatar" />
          </div>

          <div className="played-cards-area">
            {tableCards.map((card, idx) => (
              <div
                key={idx}
                className="played-mini-card"
                style={{ borderColor: CARD_DICT[card.type]?.color }}
              >
                {CARD_DICT[card.type]?.emoji}
              </div>
            ))}
          </div>

          <div className="turn-badge" style={{ backgroundColor: badgeColor }}>
            {pickStatus ? isWaiting : isChoosing}
          </div>
        </div>
      )}

      <div className="hand-container" id={`hand-${id}`}></div>

      {isMainPlayer && (
        <div className="player-info">
          <div className="avatar-small" id="my-avatar">
            <img src={avatar} alt="Meu Avatar" />
          </div>

          <div className="played-cards-area">
            {tableCards.map((card, idx) => (
              <div
                key={idx}
                className="played-mini-card"
                style={{ borderColor: CARD_DICT[card.type]?.color }}
              >
                {CARD_DICT[card.type]?.emoji}
              </div>
            ))}
          </div>

          <div className="turn-badge" style={{ backgroundColor: badgeColor }}>
            {pickStatus ? isWaiting : isChoosing}
          </div>
          <p className="nickname" id="my-nickname">
            {name}
          </p>
        </div>
      )}
    </div>
  );
}
