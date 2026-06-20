"use client";
import { useEffect, useState } from "react";

import { BadgeChip } from "@/components/Badge";
import { Button } from "@/components/ui/Button";
import { EmotePicker } from "@/components/ui/EmotePicker";
import { Field, Input } from "@/components/ui/Field";
import { useEmoteUrl } from "@/lib/use-emotes";
import { rpc } from "@/lib/rpc/client";

interface CatalogTag {
  key: string;
  label: string;
  emote: string | null;
  color: string | null;
  description: string | null;
  assignable: boolean;
  sortOrder: number;
}

const blank = {
  key: "",
  label: "",
  emote: null as string | null,
  color: "#a78bfa",
  description: "",
  assignable: true,
};

/** Live preview of a tag as the badge it will render to. */
function TagPreview({ t }: { t: { label: string; emote: string | null; color: string | null } }) {
  const emoteUrl = useEmoteUrl(t.emote);
  return (
    <BadgeChip
      b={{
        key: "preview",
        tone: "special",
        label: t.label || "rótulo",
        emoteUrl,
        color: t.color ?? undefined,
      }}
    />
  );
}

/** CRUD for the badge catalog. Assignable tags are the ones admins hand out. */
export function AdminTags() {
  const [tags, setTags] = useState<CatalogTag[] | null>(null);
  const [draft, setDraft] = useState({ ...blank });
  const [error, setError] = useState<string | null>(null);

  async function load() {
    try {
      const { tags } = await rpc.admin.tags.list();
      setTags(tags ?? []);
    } catch {
      /* keep state */
    }
  }
  useEffect(() => {
    void load();
  }, []);

  async function create() {
    setError(null);
    try {
      await rpc.admin.tags.create({
        key: draft.key.trim(),
        label: draft.label.trim(),
        emote: draft.emote,
        color: draft.color || null,
        description: draft.description.trim() || null,
        assignable: draft.assignable,
      });
      setDraft({ ...blank });
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Não foi possível criar a tag.");
    }
  }

  async function save(t: CatalogTag) {
    try {
      await rpc.admin.tags.update({
        key: t.key,
        label: t.label,
        emote: t.emote,
        color: t.color,
        description: t.description,
        assignable: t.assignable,
        sortOrder: t.sortOrder,
      });
      await load();
    } catch {
      /* ignore */
    }
  }

  async function remove(key: string) {
    if (!confirm(`Apagar a tag "${key}"? Some de todos os usuários que a têm.`)) return;
    try {
      await rpc.admin.tags.remove({ key });
      await load();
    } catch {
      /* ignore */
    }
  }

  function patch(key: string, body: Partial<CatalogTag>) {
    setTags((prev) => prev?.map((t) => (t.key === key ? { ...t, ...body } : t)) ?? prev);
  }

  if (!tags) return <p className="muted">Carregando…</p>;

  return (
    <>
      <header className="admin-page-head">
        <h1 className="settings-title">Tags</h1>
        <p className="muted">
          Tags <em>atribuíveis</em> aparecem na lista de usuários para você dar/remover. As demais
          (admin, premium, conquistas) são concedidas automaticamente — aqui você só edita o visual.
        </p>
      </header>

      <section className="admin-card-block">
        <h2 className="admin-section-title">Nova tag</h2>
        <div className="admin-form-grid">
          <Field label="Key">
            <Input
              placeholder="vip"
              value={draft.key}
              onChange={(e) => setDraft({ ...draft, key: e.target.value })}
            />
          </Field>
          <Field label="Rótulo">
            <Input
              placeholder="VIP"
              value={draft.label}
              onChange={(e) => setDraft({ ...draft, label: e.target.value })}
            />
          </Field>
          <Field label="Emote">
            <EmotePicker value={draft.emote} onChange={(emote) => setDraft({ ...draft, emote })} />
          </Field>
          <Field label="Cor">
            <input
              type="color"
              className="ui-color"
              value={draft.color}
              onChange={(e) => setDraft({ ...draft, color: e.target.value })}
            />
          </Field>
          <Field label="Descrição (tooltip)">
            <Input
              placeholder="Apoiador especial"
              value={draft.description}
              onChange={(e) => setDraft({ ...draft, description: e.target.value })}
            />
          </Field>
          <Field label="Atribuível">
            <label className="ui-switch">
              <input
                type="checkbox"
                checked={draft.assignable}
                onChange={(e) => setDraft({ ...draft, assignable: e.target.checked })}
              />
              <span>pode ser dada a usuários</span>
            </label>
          </Field>
          <div className="admin-form-foot">
            <TagPreview t={draft} />
            <Button icon="circle-check-big" onClick={create} disabled={!draft.key || !draft.label}>
              Criar tag
            </Button>
          </div>
        </div>
        {error && <p className="form-error">{error}</p>}
      </section>

      <h2 className="admin-section-title">Catálogo</h2>
      <div className="admin-tag-list">
        {tags.map((t) => (
          <div key={t.key} className="admin-tag-card">
            <div className="admin-tag-card-head">
              <TagPreview t={t} />
              <code className="muted">{t.key}</code>
              {!t.assignable && <span className="muted admin-tag-auto">automática</span>}
            </div>
            <div className="admin-form-grid">
              <Field label="Rótulo">
                <Input value={t.label} onChange={(e) => patch(t.key, { label: e.target.value })} />
              </Field>
              <Field label="Emote">
                <EmotePicker value={t.emote} onChange={(emote) => patch(t.key, { emote })} />
              </Field>
              <Field label="Cor">
                <input
                  type="color"
                  className="ui-color"
                  value={t.color ?? "#a78bfa"}
                  onChange={(e) => patch(t.key, { color: e.target.value })}
                />
              </Field>
              <Field label="Descrição">
                <Input
                  value={t.description ?? ""}
                  onChange={(e) => patch(t.key, { description: e.target.value })}
                />
              </Field>
              <Field label="Atribuível">
                <label className="ui-switch">
                  <input
                    type="checkbox"
                    checked={t.assignable}
                    onChange={(e) => patch(t.key, { assignable: e.target.checked })}
                  />
                  <span>dar a usuários</span>
                </label>
              </Field>
            </div>
            <div className="admin-tag-card-actions">
              <Button variant="ghost" size="sm" icon="circle-check-big" onClick={() => save(t)}>
                Salvar
              </Button>
              <Button variant="danger" size="sm" icon="x" onClick={() => remove(t.key)}>
                Apagar
              </Button>
            </div>
          </div>
        ))}
      </div>
    </>
  );
}
