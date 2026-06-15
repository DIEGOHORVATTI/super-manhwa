"use client";
import Link from "next/link";
import { useEffect } from "react";
import { Icon } from "@/components/Icon";
import { routes } from "@/lib/routes";

/**
 * Route-level error boundary. Catches render/data failures (e.g. the backend is
 * down) and offers a retry instead of a blank screen.
 */
export default function Error({ error, reset }: { error: Error; reset: () => void }) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className="state-screen">
      <h1 className="state-title">Algo deu errado</h1>
      <p className="muted">
        Não foi possível carregar este conteúdo agora. A fonte pode estar instável | tente de novo.
      </p>
      <div className="state-actions">
        <button type="button" className="pager-btn" onClick={() => reset()}>
          <Icon name="arrow-left" size={16} /> Tentar de novo
        </button>
        <Link className="pager-btn" href={routes.home}>
          <Icon name="house" size={16} /> Início
        </Link>
      </div>
    </div>
  );
}
