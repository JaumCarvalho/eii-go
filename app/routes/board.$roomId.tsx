import type { Route } from "./+types/board.$roomId";
import { Board } from "../board";

export function meta({}: Route.MetaArgs) {
  return [
    { title: "EiiGO - Board" },
    { name: "description", content: "Mesa de jogo EiiGO" },
  ];
}

export default function BoardRoute() {
  return <Board />;
}
