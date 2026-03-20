import { ArrowLeft, Check, Link, Play } from "lucide-react";
import { useEffect, useState, useRef } from "react";
import { useParams, useNavigate } from "react-router";
import { supabase } from "~/lib/supabase";

type Player = {
  id: string;
  room_id: string;
  nickname: string;
  avatar_url: string;
  is_host: boolean;
  is_ready: boolean;
  created_at: string;
};

export function Lobby() {
  const { roomId } = useParams();
  const navigate = useNavigate();

  const [isMounted, setIsMounted] = useState(false);
  const [players, setPlayers] = useState<Player[]>([]);
  const [copied, setCopied] = useState(false);
  const maxPlayers = 5;

  const joinLock = useRef(false);

  const isBrowser = typeof window !== "undefined";
  const [isHost, setIsHost] = useState(
    isBrowser ? localStorage.getItem("eiigo_is_host") === "true" : false,
  );
  const myPlayerIdRef = useRef<string | null>(
    isBrowser ? localStorage.getItem("eiigo_player_id") : null,
  );

  useEffect(() => {
    setIsMounted(true);
  }, []);

  useEffect(() => {
    if (!roomId || !isBrowser) return;

    const myNickname = localStorage.getItem("eiigo_nickname") || "Convidado";
    const myAvatarUrl =
      localStorage.getItem("eiigo_avatar") ||
      "https://api.dicebear.com/8.x/adventurer/svg?seed=Convidado&backgroundColor=transparent";

    const channel = supabase
      .channel(`room_${roomId}`)
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "rooms",
          filter: `id=eq.${roomId}`,
        },
        (payload) => {
          if (payload.new.status === "playing") {
            navigate(`/board/${roomId}`);
          }
        },
      )
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
          event: "UPDATE",
          schema: "public",
          table: "players",
          filter: `room_id=eq.${roomId}`,
        },
        (payload) => {
          setPlayers((current) =>
            current.map((p) =>
              p.id === payload.new.id ? (payload.new as Player) : p,
            ),
          );
          if (payload.new.id === myPlayerIdRef.current && payload.new.is_host) {
            setIsHost(true);
            localStorage.setItem("eiigo_is_host", "true");
          }
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
          setPlayers((current) => {
            const sobreviventes = current.filter(
              (p) => p.id !== payload.old.id,
            );
            const jogadorDeletado = current.find(
              (p) => p.id === payload.old.id,
            );

            if (jogadorDeletado?.is_host && sobreviventes.length > 0) {
              const maisAntigo = [...sobreviventes].sort(
                (a, b) =>
                  new Date(a.created_at).getTime() -
                  new Date(b.created_at).getTime(),
              )[0];

              if (maisAntigo.id === myPlayerIdRef.current) {
                supabase
                  .from("players")
                  .update({ is_host: true })
                  .eq("id", maisAntigo.id)
                  .then();
              }
            }
            return sobreviventes;
          });
        },
      )
      .subscribe();

    const processJoin = async () => {
      if (joinLock.current) return;
      joinLock.current = true;

      let validPlayerId = myPlayerIdRef.current;

      if (validPlayerId) {
        const { data: playerExists } = await supabase
          .from("players")
          .select("id")
          .eq("id", validPlayerId)
          .maybeSingle();
        if (!playerExists) {
          validPlayerId = null;
          myPlayerIdRef.current = null;
          localStorage.removeItem("eiigo_player_id");
          localStorage.removeItem("eiigo_is_host");
          setIsHost(false);
        }
      }

      if (!validPlayerId) {
        const { data, error } = await supabase
          .from("players")
          .insert([
            {
              room_id: roomId,
              nickname: myNickname,
              avatar_url: myAvatarUrl,
              is_host: isHost,
              is_ready: isHost,
            },
          ])
          .select("id")
          .single();

        if (data && !error) {
          myPlayerIdRef.current = data.id;
          localStorage.setItem("eiigo_player_id", data.id);
        }
      }

      const { data: allPlayers } = await supabase
        .from("players")
        .select("*")
        .eq("room_id", roomId)
        .order("created_at", { ascending: true });
      if (allPlayers) setPlayers(allPlayers);
    };

    processJoin();

    const handleUnload = () => {
      if (myPlayerIdRef.current) {
        supabase
          .from("players")
          .delete()
          .eq("id", myPlayerIdRef.current)
          .then();
      }
    };
    window.addEventListener("beforeunload", handleUnload);

    return () => {
      supabase.removeChannel(channel);
      window.removeEventListener("beforeunload", handleUnload);
    };
  }, [roomId, navigate, isBrowser, isHost]);

  useEffect(() => {
    if (!isBrowser) return;
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
  }, [players, isBrowser]);

  const handleInvite = () => {
    if (players.length >= maxPlayers) return;
    const inviteLink = `${window.location.origin}/?invite=${roomId}`;
    navigator.clipboard.writeText(inviteLink);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleToggleReady = async () => {
    const me = players.find((p) => p.id === myPlayerIdRef.current);
    if (!me) return;
    await supabase
      .from("players")
      .update({ is_ready: !me.is_ready })
      .eq("id", me.id);
  };

  const generateId = () => Math.random().toString(36).substring(2, 15);

  const createShuffledDeck = () => {
    const deck: { id: string; type: string }[] = [];

    const addCards = (type: string, quantity: number) => {
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
  };

  const handleStartGame = async () => {
    const deck = createShuffledDeck();

    const cardsPerPlayer = { 2: 10, 3: 9, 4: 8, 5: 7 }[players.length] || 7;

    for (const player of players) {
      const playerHand = deck.splice(0, cardsPerPlayer);

      await supabase
        .from("players")
        .update({
          cards_left: cardsPerPlayer,
          has_picked: false,
          hand: playerHand,
          played_cards: [],
          chosen_card: null,
        })
        .eq("id", player.id);
    }

    await supabase
      .from("rooms")
      .update({
        status: "playing",
        round: 1,
        deck: deck,
      })
      .eq("id", roomId);
  };

  const handleVoltar = async () => {
    if (myPlayerIdRef.current)
      await supabase.from("players").delete().eq("id", myPlayerIdRef.current);
    localStorage.removeItem("eiigo_player_id");
    localStorage.removeItem("eiigo_is_host");
    navigate("/");
  };

  if (!isMounted) return null;

  const me = players.find((p) => p.id === myPlayerIdRef.current);
  const myReadyState = me?.is_ready ?? false;
  const todosProntos = players.length > 0 && players.every((p) => p.is_ready);

  return (
    <>
      <button className="btn-back" onClick={handleVoltar}>
        <ArrowLeft /> SAIR
      </button>

      <main className="main-container lobby-container">
        <section className="lobby-card">
          <header className="lobby-header">
            <div className="player-count">
              <h2>
                JOGADORES: {players.length}/{maxPlayers}
              </h2>
            </div>
            {isHost && (
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
                    <Check /> COPIADO!
                  </>
                ) : players.length >= maxPlayers ? (
                  "SALA CHEIA"
                ) : (
                  <>
                    <Link /> CONVIDAR
                  </>
                )}
              </button>
            )}
          </header>
          <div className="player-list">
            {players.map((player) => (
              <div
                className="player-item"
                key={player.id}
                style={{ border: player.is_ready ? "3px solid #6bcb77" : "" }}
              >
                <div className="player-avatar-small">
                  <img src={player.avatar_url} alt="Avatar" />
                </div>
                <p className="player-name" style={{ flexGrow: 1 }}>
                  {player.nickname}{" "}
                  {player.id === myPlayerIdRef.current && " (Você)"}
                </p>
                <span
                  style={{
                    fontSize: "0.9rem",
                    fontWeight: "bold",
                    color: player.is_ready ? "#6bcb77" : "#ccc",
                  }}
                >
                  {player.is_host
                    ? "HOST"
                    : player.is_ready
                      ? "PRONTO"
                      : "AGUARDANDO..."}
                </span>
              </div>
            ))}
          </div>
        </section>

        {isHost ? (
          <button
            className="btn-start"
            onClick={handleStartGame}
            disabled={!todosProntos || players.length === 1}
            style={{
              backgroundColor:
                !todosProntos || players.length === 1 ? "#ccc" : "",
            }}
          >
            <Play /> INICIAR PARTIDA
          </button>
        ) : (
          <button
            className="btn-start"
            onClick={handleToggleReady}
            style={{
              backgroundColor: myReadyState ? "#6bcb77" : "#ffd93d",
              color: "#1e293b",
            }}
          >
            <Check /> {myReadyState ? "ESTOU PRONTO" : "PRONTO?"}
          </button>
        )}
      </main>
    </>
  );
}
