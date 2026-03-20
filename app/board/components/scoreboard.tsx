import type { OccupiedSeat } from "../types";

interface ScoreboardProps {
  currentRound: number;
  myId: string;
  myName: string;
  myAvatar: string;
  pickStatus: Record<string, boolean>;
  scores: Record<string, number>;
  occupiedSeats: OccupiedSeat[];
}

export function Scoreboard({
  currentRound,
  myId,
  myName,
  myAvatar,
  pickStatus,
  scores,
  occupiedSeats,
}: ScoreboardProps) {
  const allPlayers = [
    {
      id: myId,
      nome: myName,
      avatar: myAvatar,
      score: scores[myId] || 0,
      isMe: true,
    },
    ...occupiedSeats.map((seat) => ({
      id: seat.player.id,
      nome: seat.player.nome,
      avatar: seat.player.avatar,
      score: scores[seat.player.id] || 0,
      isMe: false,
    })),
  ];

  const sortedPlayers = allPlayers.sort((a, b) => b.score - a.score);

  return (
    <aside className="scoreboard-container">
      <h4>RODADA {currentRound}/3</h4>
      <div className="scoreboard-list">
        {sortedPlayers.map((player) => (
          <div className="score-item" key={player.id}>
            <div
              className="avatar-micro"
              style={{
                borderColor: pickStatus[player.id] ? "var(--wasabi-green)" : "",
              }}
            >
              <img src={player.avatar} alt={player.nome} />
            </div>
            <span style={{ flexGrow: 1 }}>
              {player.nome} {player.isMe && "(Você)"}
            </span>
            <span>{player.score} pts</span>
          </div>
        ))}
      </div>
    </aside>
  );
}
