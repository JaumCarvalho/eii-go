import { RefreshCw } from "lucide-react";
import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router";
import { supabase } from "~/lib/supabase";

type PlayerScore = {
  id: string;
  nome: string;
  avatar: string;
  score: number;
  puddings: number;
};

export function Results() {
  const { roomId } = useParams();
  const navigate = useNavigate();
  const [ranking, setRanking] = useState<PlayerScore[]>([]);
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);
    if (typeof window === "undefined" || !roomId) return;

    const loadRanking = async () => {
      const { data: jogadoresDB } = await supabase
        .from("players")
        .select("id, nickname, avatar_url, score, puddings")
        .eq("room_id", roomId);

      if (jogadoresDB) {
        let rankeados = jogadoresDB.map((j) => ({
          id: j.id,
          nome: j.nickname,
          avatar: j.avatar_url,
          score: j.score || 0,
          puddings: j.puddings || 0,
        }));

        if (rankeados.length >= 2) {
          const maxPud = Math.max(...rankeados.map((r) => r.puddings));
          const minPud = Math.min(...rankeados.map((r) => r.puddings));

          rankeados = rankeados.map((r) => {
            let finalScore = r.score;
            if (r.puddings === maxPud) {
              const empatadosMax = rankeados.filter(
                (x) => x.puddings === maxPud,
              ).length;
              finalScore += Math.floor(6 / empatadosMax);
            }
            if (
              r.puddings === minPud &&
              rankeados.length > 2 &&
              minPud !== maxPud
            ) {
              const empatadosMin = rankeados.filter(
                (x) => x.puddings === minPud,
              ).length;
              finalScore -= Math.floor(6 / empatadosMin);
            }
            return { ...r, score: finalScore };
          });
        }

        rankeados.sort((a, b) => b.score - a.score);
        setRanking(rankeados);
      }
    };

    loadRanking();
  }, [roomId]);

  const handlePlayAgain = async () => {
    const isHost = localStorage.getItem("eiigo_is_host") === "true";
    const meuId = localStorage.getItem("eiigo_player_id");

    if (isHost) {
      await supabase
        .from("rooms")
        .update({ status: "waiting", current_turn: null })
        .eq("id", roomId);
    }

    navigate(`/lobby/${roomId}`);
  };

  if (!isMounted) return null;

  return (
    <>
      <main className="main-container results-container">
        <header className="logo-container">
          <h1 className="logo-text">
            FIM DE <span className="logo-highlight">JOGO!</span>
          </h1>
        </header>

        <section className="results-card">
          <h3 className="instruction-text" style={{ marginBottom: "1.5rem" }}>
            Ranking Final
          </h3>
          <div className="ranking-list">
            {ranking.map((player, index) => {
              const isFirst = index === 0;
              return (
                <div
                  className={`ranking-item ${isFirst ? "first-place" : ""}`}
                  key={player.id}
                >
                  <div className="ranking-pos">{index + 1}º</div>
                  <div className="ranking-avatar">
                    <img src={player.avatar} alt={player.nome} />
                  </div>
                  <p className="ranking-name">
                    {player.nome}{" "}
                    {player.id === localStorage.getItem("eiigo_player_id") &&
                      "(Você)"}
                  </p>
                  <div className="ranking-score">{player.score} pts</div>
                </div>
              );
            })}
          </div>
        </section>

        <button className="btn-start btn-play-again" onClick={handlePlayAgain}>
          <RefreshCw />
          VOLTAR AO LOBBY
        </button>
      </main>
    </>
  );
}
