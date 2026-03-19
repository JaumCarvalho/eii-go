import type { Route } from "./+types/lobby.$roomId";
import { Lobby } from "../lobby";

export function meta({}: Route.MetaArgs) {
  return [
    { title: "EiiGO - Sala de Espera" },
    { name: "description", content: "Aguardando jogadores para a partida" },
  ];
}

export default function LobbyRoute() {
  return <Lobby />;
}
