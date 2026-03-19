import { Play, RefreshCw } from "lucide-react";
import { useState, useEffect } from "react";

export function CreateGame() {
  const [nickname, setNickname] = useState("");
  const [seed, setSeed] = useState("Random");
  return (
    <>
      <main className="main-container">
        <header className="logo-container">
          <h1 className="logo-text">
            EII<span className="logo-highlight">GO</span>
          </h1>
        </header>

        <section className="profile-card">
          <h3 className="instruction-text">ESCOLHA SEU AVATAR E NICKNAME</h3>

          <div className="avatar-selection-wrapper">
            <div className="avatar-display">
              <img
                src={`https://api.dicebear.com/8.x/adventurer/svg?seed=${seed}&backgroundColor=transparent`}
                alt="Avatar"
                className="avatar-img"
              />
            </div>
            <button
              className="btn-refresh"
              aria-label="Mudar avatar"
              onClick={() => {}}
            >
              <RefreshCw />
            </button>
          </div>

          <div className="input-wrapper">
            <input
              type="text"
              placeholder="NickName123"
              className="input-nickname"
              maxLength={15}
              value={nickname}
              onChange={(e) => setNickname(e.target.value)}
            />
          </div>

          <button className="btn-create-room" onClick={() => {}}>
            <Play />
            CRIAR SALA
          </button>
        </section>
      </main>
    </>
  );
}
