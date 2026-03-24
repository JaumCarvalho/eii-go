import { useEffect, useState, useRef } from "react";
import { useNavigate } from "react-router";
import { supabase } from "~/lib/supabase";
import type { Card, PlayerData, OccupiedSeat } from "../types";
import { renderHand } from "../utils/engine";
import { calculateRoundScores } from "../utils/rules";

export function useGame(roomId: string) {
  const navigate = useNavigate();
  const isBrowser = typeof window !== "undefined";

  const [isLoaded, setIsLoaded] = useState(false);
  const [players, setPlayers] = useState<PlayerData[]>([]);
  const [myName, setMyName] = useState("Você");
  const [myAvatar, setMyAvatar] = useState("");
  const [myId, setMyId] = useState("");

  const [myHand, setMyHand] = useState<Card[]>([]);
  const [tableCards, setTableCards] = useState<Record<string, Card[]>>({});
  const [scores, setScores] = useState<Record<string, number>>({});
  const [currentRound, setCurrentRound] = useState<number>(1);
  const [cardCounts, setCardCounts] = useState<Record<string, number>>({});
  const [pickStatus, setPickStatus] = useState<Record<string, boolean>>({});
  const [reloadBoard, setReloadBoard] = useState(0);

  const myHandRef = useRef(myHand);
  const pickStatusRef = useRef(pickStatus);
  const engineStarted = useRef(false);

  const hostLock = useRef(false);

  useEffect(() => {
    myHandRef.current = myHand;
  }, [myHand]);
  useEffect(() => {
    pickStatusRef.current = pickStatus;
  }, [pickStatus]);

  useEffect(() => {
    if (!isBrowser) return;
    setMyName(localStorage.getItem("eiigo_nickname") || "Convidado");
    setMyAvatar(localStorage.getItem("eiigo_avatar") || "");
    setMyId(localStorage.getItem("eiigo_player_id") || "");
    const savedMatch = localStorage.getItem("eiigo_jogadores_partida");
    if (savedMatch) setPlayers(JSON.parse(savedMatch));
  }, [isBrowser]);

  const opponents = players.filter((j) => j.id !== myId);
  const seatPositions =
    opponents.length >= 4
      ? ["left", "top-left", "top-right", "right"]
      : ["left", "top", "right"];
  const occupiedSeats = seatPositions
    .map((position, index) =>
      index < opponents.length
        ? { position, id: `player-${position}`, player: opponents[index] }
        : null,
    )
    .filter(Boolean) as OccupiedSeat[];

  useEffect(() => {
    if (players.length === 0 || !roomId || !myId) return;

    const loadBoard = async () => {
      const { data: roomData } = await supabase
        .from("rooms")
        .select("round, status")
        .eq("id", roomId)
        .single();
      if (roomData?.status === "finished") {
        navigate(`/resultados/${roomId}`);
        return;
      }
      if (roomData?.round) setCurrentRound(roomData.round);

      const { data: dbPlayers } = await supabase
        .from("players")
        .select("id, cards_left, has_picked, hand, played_cards, score")
        .eq("room_id", roomId);
      if (dbPlayers) {
        const counts: Record<string, number> = {};
        const statuses: Record<string, boolean> = {};
        const boardCards: Record<string, Card[]> = {};
        const boardScores: Record<string, number> = {};

        dbPlayers.forEach((p) => {
          counts[p.id] = p.cards_left ?? 0;
          statuses[p.id] = p.has_picked ?? false;
          boardCards[p.id] = p.played_cards || [];
          boardScores[p.id] = p.score || 0;
          if (p.id === myId) setMyHand(p.hand || []);
        });

        setCardCounts(counts);
        setPickStatus(statuses);
        setTableCards(boardCards);
        setScores(boardScores);
      }
      setIsLoaded(true);
    };

    loadBoard();
  }, [players.length, roomId, myId, reloadBoard, navigate]);

  useEffect(() => {
    if (localStorage.getItem("eiigo_is_host") !== "true") return;
    if (!isLoaded || players.length === 0) return;

    const allReady =
      players.length > 0 && players.every((p) => pickStatus[p.id] === true);

    if (allReady && !hostLock.current) {
      hostLock.current = true;
      processRoundEnd();
    } else if (!allReady) {
      hostLock.current = false;
    }
  }, [pickStatus, isLoaded, players]);

  const processRoundEnd = async () => {
    try {
      const { data: dbPlayers } = await supabase
        .from("players")
        .select(
          "id, has_picked, hand, chosen_card, played_cards, score, puddings",
        )
        .eq("room_id", roomId)
        .order("created_at", { ascending: true });
      if (!dbPlayers) return;

      for (const p of dbPlayers) {
        if (p.chosen_card)
          p.played_cards = [...(p.played_cards || []), p.chosen_card];
      }

      const isHandEmpty = dbPlayers.every((p) => p.hand.length === 0);

      if (isHandEmpty) {
        const updates = calculateRoundScores(dbPlayers);
        const { data: roomData } = await supabase
          .from("rooms")
          .select("round, deck")
          .eq("id", roomId)
          .single();
        let isFinished = false;

        if (roomData) {
          if (roomData.round < 3) {
            const remainingDeck = roomData.deck || [];
            const cardsPerPlayer =
              { 2: 10, 3: 9, 4: 8, 5: 7 }[dbPlayers.length] || 7;

            for (const p of dbPlayers) {
              const newHand = remainingDeck.splice(0, cardsPerPlayer);
              await supabase
                .from("players")
                .update({
                  score: updates[p.id].score,
                  puddings: updates[p.id].puddings,
                  hand: newHand,
                  cards_left: cardsPerPlayer,
                  played_cards: [],
                  has_picked: false,
                  chosen_card: null,
                })
                .eq("id", p.id);
            }
            await supabase
              .from("rooms")
              .update({ round: roomData.round + 1, deck: remainingDeck })
              .eq("id", roomId);
          } else {
            isFinished = true;
            for (const p of dbPlayers) {
              await supabase
                .from("players")
                .update({
                  score: updates[p.id].score,
                  puddings: updates[p.id].puddings,
                  has_picked: false,
                })
                .eq("id", p.id);
            }
            await supabase
              .from("rooms")
              .update({ status: "finished" })
              .eq("id", roomId);
          }
        }
        if (!isFinished)
          await supabase
            .channel(`game_cards_${roomId}`)
            .send({ type: "broadcast", event: "reveal_and_pass", payload: {} });
      } else {
        const playersInCircle = dbPlayers.map((p) => ({
          id: p.id,
          hand: p.hand,
        }));
        for (let i = 0; i < playersInCircle.length; i++) {
          const fromIndex = i === 0 ? playersInCircle.length - 1 : i - 1;
          const handToReceive = playersInCircle[fromIndex].hand;

          await supabase
            .from("players")
            .update({
              hand: handToReceive,
              has_picked: false,
              chosen_card: null,
              cards_left: handToReceive.length,
              played_cards: dbPlayers.find(
                (t) => t.id === playersInCircle[i].id,
              )?.played_cards,
            })
            .eq("id", playersInCircle[i].id);
        }
        await supabase
          .channel(`game_cards_${roomId}`)
          .send({ type: "broadcast", event: "reveal_and_pass", payload: {} });
      }
    } catch (error) {
      console.error(error);
      hostLock.current = false;
    }
  };

  useEffect(() => {
    if (!isLoaded || !myId || engineStarted.current) return;
    engineStarted.current = true;

    renderHand(`hand-${myId}`, myHandRef.current, "bottom", false);
    occupiedSeats.forEach((seat) => {
      renderHand(
        `hand-${seat.player.id}`,
        cardCounts[seat.player.id] || 0,
        seat.position,
        true,
      );
    });

    const roomChannel = supabase
      .channel(`room_sync_${roomId}`)
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "rooms",
          filter: `id=eq.${roomId}`,
        },
        (payload) => {
          if (payload.new.round) setCurrentRound(payload.new.round);
          if (payload.new.status === "finished")
            navigate(`/resultados/${roomId}`);
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
          setPickStatus((prev) => ({
            ...prev,
            [payload.new.id]: payload.new.has_picked,
          }));
          if (payload.new.cards_left !== undefined) {
            setCardCounts((prev) => ({
              ...prev,
              [payload.new.id]: payload.new.cards_left,
            }));
          }
        },
      )
      .subscribe();

    const gameChannel = supabase.channel(`game_cards_${roomId}`, {
      config: { broadcast: { self: true } },
    });
    gameChannel
      .on("broadcast", { event: "reveal_and_pass" }, () => {
        setIsLoaded(false);
        engineStarted.current = false;
        setReloadBoard((prev) => prev + 1);
      })
      .subscribe();

    const myHandEl = document.getElementById(`hand-${myId}`);

    const handleCardClick = async (event: MouseEvent) => {
      const target = event.target as HTMLElement;
      const cardEl = target.closest(".board-card") as HTMLElement;

      if (!cardEl || pickStatusRef.current[myId]) return;

      pickStatusRef.current[myId] = true;

      const clickedCardId = cardEl.dataset.cardId;
      const chosenCard = myHandRef.current.find((c) => c.id === clickedCardId);

      if (!chosenCard) {
        pickStatusRef.current[myId] = false;
        return;
      }

      cardEl.style.transform = `translateY(-30px)`;
      cardEl.style.opacity = "0.5";

      const newHand = myHandRef.current.filter((c) => c.id !== clickedCardId);
      setMyHand(newHand);
      setPickStatus((prev) => ({ ...prev, [myId]: true }));

      await supabase
        .from("players")
        .update({ has_picked: true, chosen_card: chosenCard, hand: newHand })
        .eq("id", myId);
    };

    if (myHandEl) myHandEl.addEventListener("click", handleCardClick);

    return () => {
      if (myHandEl) myHandEl.removeEventListener("click", handleCardClick);
      supabase.removeChannel(gameChannel);
      supabase.removeChannel(roomChannel);
      engineStarted.current = false;
    };
  }, [isLoaded, roomId, occupiedSeats.length, navigate]);

  return {
    isLoaded,
    myId,
    myName,
    myAvatar,
    currentRound,
    pickStatus,
    scores,
    occupiedSeats,
    cardCounts,
    tableCards,
  };
}
