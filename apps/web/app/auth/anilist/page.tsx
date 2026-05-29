"use client";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { completeAuthFromHash, consumeReturnPath } from "@/lib/anilist";

/**
 * AniList implicit-grant callback. The access token arrives in the URL fragment
 * (never sent to the server), so we parse it here on the client, store the
 * session, and bounce back to wherever the user started.
 */
export default function AniListCallback() {
  const router = useRouter();
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    let active = true;
    (async () => {
      const ok = await completeAuthFromHash(window.location.hash);
      if (!active) return;
      if (ok) router.replace(consumeReturnPath());
      else setFailed(true);
    })();
    return () => {
      active = false;
    };
  }, [router]);

  return (
    <div className="state-screen">
      <h1 className="state-title">{failed ? "Falha ao conectar" : "Conectando ao AniList…"}</h1>
      <p className="muted">
        {failed
          ? "Não recebemos o token de acesso. Tente novamente pela Biblioteca."
          : "Só um instante."}
      </p>
    </div>
  );
}
