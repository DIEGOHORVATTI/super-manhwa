"use client";
import Link from "next/link";
import { useEffect, useState } from "react";

import { rpc } from "@/lib/rpc/client";

interface Card {
  cardId: number;
  front: string;
  back: string;
}

const GRADES: Array<{ rating: 1 | 2 | 3 | 4; label: string; cls: string }> = [
  { rating: 1, label: "Errei", cls: "g-again" },
  { rating: 2, label: "Difícil", cls: "g-hard" },
  { rating: 3, label: "Bom", cls: "g-good" },
  { rating: 4, label: "Fácil", cls: "g-easy" },
];

/**
 * Cloze review session (FSRS-scheduled). Shows the real sentence with a blank;
 * the reader recalls the word, reveals the answer, then grades it. Grades feed
 * FSRS server-side and award XP/streak.
 */
export function ReviewSession() {
  const [cards, setCards] = useState<Card[] | null>(null);
  const [i, setI] = useState(0);
  const [revealed, setRevealed] = useState(false);
  const [done, setDone] = useState(0);

  useEffect(() => {
    rpc.learn
      .reviewQueue()
      .then((d) => setCards(d.cards ?? []))
      .catch(() => setCards([]));
  }, []);

  if (!cards) return <p className="muted studio-wrap">Carregando…</p>;

  const card = cards[i];
  if (!card) {
    return (
      <div className="studio-wrap review-done">
        <h1 className="settings-title">Sessão concluída 🎉</h1>
        <p className="muted">{done} cards revisados.</p>
        <Link href="/learn" className="auth-submit" style={{ alignSelf: "center" }}>
          Voltar ao painel
        </Link>
      </div>
    );
  }

  async function grade(rating: 1 | 2 | 3 | 4) {
    try {
      await rpc.learn.gradeReview({ cardId: card.cardId, rating });
    } catch {
      // best-effort; advance regardless so the session keeps flowing
    }
    setDone((d) => d + 1);
    setRevealed(false);
    setI((n) => n + 1);
  }

  return (
    <div className="studio-wrap review-wrap">
      <div className="review-progress muted">
        {i + 1} / {cards.length}
      </div>
      <div className="review-card">
        <p className="review-front">{card.front}</p>
        {revealed ? (
          <>
            <p className="review-back">{card.back}</p>
            <div className="review-grades">
              {GRADES.map((g) => (
                <button
                  key={g.rating}
                  type="button"
                  className={`review-grade ${g.cls}`}
                  onClick={() => grade(g.rating)}
                >
                  {g.label}
                </button>
              ))}
            </div>
          </>
        ) : (
          <button type="button" className="auth-submit" onClick={() => setRevealed(true)}>
            Mostrar resposta
          </button>
        )}
      </div>
    </div>
  );
}
