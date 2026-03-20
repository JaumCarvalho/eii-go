import { CARD_DICT } from "../constants";
import type { Card } from "../types";

export function renderHand(
  containerId: string,
  cards: Card[] | number,
  position: string,
  isFaceDown: boolean = false,
) {
  const container = document.getElementById(containerId);
  if (!container) return;
  container.innerHTML = "";

  const numCards = typeof cards === "number" ? cards : cards.length;
  if (numCards === 0) return;

  const arcSpread = position === "bottom" ? 40 : 60;
  const startAngle = -(arcSpread / 2);
  const angleStep = arcSpread / (numCards > 1 ? numCards - 1 : 1);

  for (let i = 0; i < numCards; i++) {
    const cardObj = typeof cards === "number" ? null : cards[i];
    const cardEl = document.createElement("div");
    cardEl.className = `board-card ${isFaceDown ? "face-down" : ""}`;
    cardEl.style.zIndex = i.toString();

    if (cardObj && !isFaceDown) {
      cardEl.dataset.cardId = cardObj.id;
      const info = CARD_DICT[cardObj.type] || {
        emoji: "❓",
        label: "Unknown",
        color: "#ccc",
      };
      cardEl.style.borderTopColor = info.color;
      cardEl.innerHTML = `<div class="card-emoji">${info.emoji}</div><div class="card-label">${info.label}</div>`;
    }

    let angle = startAngle + i * angleStep;
    let xOffset = 0;
    if (position === "bottom") xOffset = (i - (numCards - 1) / 2) * 85;

    cardEl.style.setProperty("--angle", `${angle}deg`);
    cardEl.style.setProperty("--x", `${xOffset}px`);
    cardEl.style.setProperty("--y", `0px`);

    let origin = "center 200%";
    if (position === "top") origin = "center -50%";
    if (position === "left") origin = "-50% center";
    if (position === "right") origin = "150% center";
    cardEl.style.setProperty("--origin", origin);

    container.appendChild(cardEl);
  }
}
