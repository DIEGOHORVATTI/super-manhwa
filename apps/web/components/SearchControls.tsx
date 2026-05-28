"use client";
import { useRouter } from "next/navigation";
import { useState } from "react";
import type { Source } from "@packages/contracts";

interface Props {
  sources: Source[];
  source: string;
  q: string;
}

export function SearchControls({ sources, source, q }: Props) {
  const router = useRouter();
  const [term, setTerm] = useState(q);

  const go = (nextSource: string, nextQ: string) => {
    const sp = new URLSearchParams();
    sp.set("source", nextSource);
    if (nextQ) sp.set("q", nextQ);
    router.push(`/?${sp.toString()}`);
  };

  return (
    <>
      <div className="row">
        <select className="select" value={source} onChange={(e) => go(e.target.value, "")}>
          {sources.map((s) => (
            <option key={s.id} value={s.id}>
              {s.name} ({s.lang}){s.hasCloudflare ? " 🛡" : ""}
            </option>
          ))}
        </select>
      </div>
      <form className="row searchbar" onSubmit={(e) => { e.preventDefault(); go(source, term.trim()); }}>
        <input
          className="field" value={term} placeholder="Buscar… (vazio = populares)"
          onChange={(e) => setTerm(e.target.value)}
        />
        <button className="btn" type="submit">Buscar</button>
      </form>
    </>
  );
}
