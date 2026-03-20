import { type RouteConfig, index, route } from "@react-router/dev/routes";

export default [
  index("routes/create-game.tsx"),
  route("lobby/:roomId", "routes/lobby.$roomId.tsx"),
  route("board/:roomId", "routes/board.$roomId.tsx"),
  route("resultados/:roomId", "routes/results.$roomId.tsx"),
] satisfies RouteConfig;
