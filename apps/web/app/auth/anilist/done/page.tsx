"use client";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { completeAuthFromHash, consumeReturnPath } from "@/lib/anilist";

/**
 * Final hop of the AniList login: the server callback redirected here with the
 * access token in the fragment. We persist it (localStorage) and bounce back to
 * wherever the user started.
 */
export default function AniListDone() {
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
          ? "Não foi possível concluir o login. Tente novamente pela Biblioteca."
          : "Só um instante."}
      </p>
    </div>
  );
}
