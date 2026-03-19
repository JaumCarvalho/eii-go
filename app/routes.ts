import { type RouteConfig, index, route } from "@react-router/dev/routes";

export default [
  index("routes/create-game.tsx"),

  route("lobby/:roomId", "routes/lobby.$roomId.tsx"),
] satisfies RouteConfig;
