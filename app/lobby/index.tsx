import { ArrowLeft, Check, Link, Play } from "lucide-react";
import { useEffect, useState, useRef } from "react";
import { useParams, useNavigate } from "react-router";
import { supabase } from "~/lib/supabase";

type Player = {
  id: string;
  room_id: string;
  nickname: string;
  avatar_url: string;
};

export function Lobby() {
  const { roomId } = useParams();
  const navigate = useNavigate();

  const [players, setPlayers] = useState<Player[]>([]);
  const [copied, setCopied] = useState(false);
  const maxPlayers = 5;

  const joinLock = useRef(false);

  useEffect(() => {
    if (!roomId) return;

    const myNickname = localStorage.getItem("eiigo_nickname") || "Convidado";
    const myAvatarUrl =
      localStorage.getItem("eiigo_avatar") ||
      "https://api.dicebear.com/8.x/adventurer/svg?seed=Convidado&backgroundColor=transparent";

    const channel = supabase
      .channel(`room_${roomId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "players",
          filter: `room_id=eq.${roomId}`,
        },
        (payload) => {
          setPlayers((current) => {
            if (current.find((p) => p.id === payload.new.id)) return current;
            return [...current, payload.new as Player];
          });
        },
      )
      .on(
        "postgres_changes",
        {
          event: "DELETE",
          schema: "public",
          table: "players",
          filter: `room_id=eq.${roomId}`,
        },
        (payload) => {
          setPlayers((current) =>
            current.filter((p) => p.id !== payload.old.id),
          );
        },
      )
      .subscribe();

    const fetchPlayers = async () => {
      const { data } = await supabase
        .from("players")
        .select("*")
        .eq("room_id", roomId)
        .order("created_at", { ascending: true });

      if (data) setPlayers(data);
    };

    const processJoin = async () => {
      const myPlayerId = localStorage.getItem("eiigo_player_id");

      if (myPlayerId) {
        await fetchPlayers();
        return;
      }

      if (joinLock.current) {
        await fetchPlayers();
        return;
      }

      joinLock.current = true;

      const { data, error } = await supabase
        .from("players")
        .insert([
          {
            room_id: roomId,
            nickname: myNickname,
            avatar_url: myAvatarUrl,
          },
        ])
        .select("id")
        .single();

      if (data && !error) {
        localStorage.setItem("eiigo_player_id", data.id);
      }

      await fetchPlayers();
    };

    processJoin();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [roomId]);

  const handleInvite = () => {
    if (players.length >= maxPlayers) return;
    const inviteLink = `${window.location.origin}/?invite=${roomId}`;
    navigator.clipboard.writeText(inviteLink);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleStart = () => {
    localStorage.setItem(
      "eiigo_jogadores_partida",
      JSON.stringify(
        players.map((p) => ({
          id: p.id,
          nome: p.nickname,
          avatar: p.avatar_url,
        })),
      ),
    );

    navigate(`/tabuleiro/${roomId}`);
  };

  const handleVoltar = () => {
    localStorage.removeItem("eiigo_player_id");
    navigate("/");
  };

  return (
    <>
      <button className="btn-back" onClick={handleVoltar}>
        <ArrowLeft />
        VOLTAR
      </button>

      <main className="main-container lobby-container">
        <section className="lobby-card">
          <header className="lobby-header">
            <div className="player-count">
              <h2>
                JOGADORES: {players.length}/{maxPlayers}
              </h2>
            </div>

            <button
              className="btn-invite"
              onClick={handleInvite}
              disabled={players.length >= maxPlayers}
              style={{
                backgroundColor: players.length >= maxPlayers ? "#ccc" : "",
              }}
            >
              {copied ? (
                <>
                  <Check />
                  COPIADO!
                </>
              ) : players.length >= maxPlayers ? (
                "SALA CHEIA"
              ) : (
                <>
                  <Link />
                  CONVIDAR
                </>
              )}
            </button>
          </header>

          <div className="player-list">
            {players.map((player) => (
              <div className="player-item" key={player.id}>
                <div className="player-avatar-small">
                  <img src={player.avatar_url} alt="Avatar" />
                </div>
                <p className="player-name">
                  {player.nickname}
                  {player.id === localStorage.getItem("eiigo_player_id") &&
                    " (Você)"}
                </p>
              </div>
            ))}

            {players.length === 0 && (
              <p style={{ textAlign: "center", opacity: 0.5 }}>
                A carregar jogadores...
              </p>
            )}
          </div>
        </section>

        <button className="btn-start" onClick={handleStart}>
          <Play />
          INICIAR
        </button>
      </main>
    </>
  );
}
