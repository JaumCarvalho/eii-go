import { Play, RefreshCw, LogIn } from "lucide-react";
import { useState, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router";
import { supabase } from "~/lib/supabase";

export function CreateGame() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const inviteRoomId = searchParams.get("invite");

  const [nickname, setNickname] = useState("");
  const [seed, setSeed] = useState("Felix");

  useEffect(() => {
    localStorage.removeItem("eiigo_player_id");
    localStorage.removeItem("eiigo_is_host");
  }, []);

  const randomSeedGenerator = () => Math.random().toString(36).substring(2, 10);

  const handleRefreshAvatar = (e: React.MouseEvent) => {
    e.preventDefault();
    setSeed(randomSeedGenerator());
  };

  const handleAction = async () => {
    const finalNickname = nickname.trim() || "NickName123";
    const avatarUrl = `https://api.dicebear.com/8.x/adventurer/svg?seed=${seed}&backgroundColor=transparent`;

    localStorage.setItem("eiigo_nickname", finalNickname);
    localStorage.setItem("eiigo_avatar", avatarUrl);

    if (inviteRoomId) {
      localStorage.setItem("eiigo_is_host", "false");
      navigate(`/lobby/${inviteRoomId}`);
    } else {
      localStorage.setItem("eiigo_is_host", "true");
      const { data: room, error } = await supabase
        .from("rooms")
        .insert([{ status: "waiting" }])
        .select("id")
        .single();

      if (error) {
        console.error("Erro ao criar sala:", error);
        alert("Ops! Falha ao criar a sala no servidor.");
        return;
      }

      navigate(`/lobby/${room.id}`);
    }
  };

  return (
    <>
      <main className="main-container">
        <header className="logo-container">
          <h1 className="logo-text">
            EII<span className="logo-highlight">GO</span>
          </h1>
        </header>

        <section className="profile-card">
          <h3 className="instruction-text">
            {inviteRoomId
              ? "VOCÊ FOI CONVIDADO!"
              : "ESCOLHA SEU AVATAR E NICKNAME"}
          </h3>

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
              onClick={handleRefreshAvatar}
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

          <button className="btn-create-room" onClick={handleAction}>
            {inviteRoomId ? (
              <>
                <LogIn />
                ENTRAR NA SALA
              </>
            ) : (
              <>
                <Play />
                CRIAR SALA
              </>
            )}
          </button>
        </section>
      </main>
    </>
  );
}
