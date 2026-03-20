import { Results } from "~/results";
import type { Route } from "./+types/results.$roomId";

export function meta({}: Route.MetaArgs) {
  return [
    { title: "EiiGO - Resultados" },
    { name: "description", content: "Pódio final da partida" },
  ];
}

export default function ResultadosRoute() {
  return <Results />;
}
