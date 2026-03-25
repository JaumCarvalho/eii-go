import { useParams } from "react-router";
import { useGame } from "./hooks/useGame";
import { Scoreboard } from "./components/scoreboard";
import { PlayerSpot } from "./components/player-spot";

export function Board() {
  const { roomId } = useParams();
  const gameState = useGame(roomId as string);

  if (!gameState.isLoaded) {
    return (
      <div
        style={{
          width: "100vw",
          height: "100vh",
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
        }}
      >
        Loading board...
      </div>
    );
  }

  return (
    <div className="board-body">
      <Scoreboard {...gameState} />

      <main className="tabletop">
        {gameState.timeLeft > 0 && (
          <div
            className="center-countdown"
            data-urgent={gameState.timeLeft <= 3 ? "true" : "false"}
          >
            <span>{gameState.timeLeft}</span>
          </div>
        )}

        {gameState.occupiedSeats.map((seat) => (
          <PlayerSpot
            key={seat.player.id}
            id={seat.player.id}
            name={seat.player.nome}
            avatar={seat.player.avatar}
            position={seat.position}
            isMainPlayer={false}
            pickStatus={gameState.pickStatus[seat.player.id] ?? false}
            cardCount={gameState.cardCounts[seat.player.id] ?? 0}
            tableCards={gameState.tableCards[seat.player.id] || []}
          />
        ))}

        <PlayerSpot
          id={gameState.myId}
          name={gameState.myName}
          avatar={gameState.myAvatar}
          position="bottom"
          isMainPlayer={true}
          pickStatus={gameState.pickStatus[gameState.myId] ?? false}
          cardCount={gameState.cardCounts[gameState.myId] ?? 0}
          tableCards={gameState.tableCards[gameState.myId] || []}
        />
      </main>
    </div>
  );
}
