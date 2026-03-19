import type { Route } from "./+types/create-game";
import { CreateGame } from "../create-game";

export function meta({}: Route.MetaArgs) {
  return [{ title: "EiiGO" }, { name: "description", content: "Card Game" }];
}

export default function Home() {
  return <CreateGame />;
}
