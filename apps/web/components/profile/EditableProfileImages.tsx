"use client";
import { useRouter } from "next/navigation";
import { useRef, useState } from "react";

import { Icon } from "@/components/Icon";
import { downscaleToJpeg } from "@/lib/image-resize";
import { routes } from "@/lib/routes";

/** Resize/re-encode to JPEG (handles huge phone photos + HEIC), then POST it. */
async function upload(endpoint: string, file: File, maxDim: number): Promise<Response> {
  const blob = await downscaleToJpeg(file, maxDim).catch(() => file);
  const out =
    blob.type === "image/jpeg" ? new File([blob], "image.jpg", { type: "image/jpeg" }) : file;
  const fd = new FormData();
  fd.set("image", out);
  return fetch(endpoint, { method: "POST", body: fd });
}

function EditButton({
  endpoint,
  label,
  className,
  maxDim,
}: {
  endpoint: string;
  label: string;
  className: string;
  /** Longest-edge cap for the re-encoded image (avatar small, banner large). */
  maxDim: number;
}) {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onPick(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    setBusy(true);
    setError(null);
    try {
      const res = await upload(endpoint, file, maxDim);
      if (res.ok) {
        router.refresh();
      } else {
        setError(
          res.status === 400
            ? "Imagem inválida ou muito grande. Tente um JPG ou PNG."
            : res.status === 401
              ? "Faça login para alterar a imagem."
              : "Não foi possível enviar. Tente de novo.",
        );
      }
    } catch {
      setError("Falha no envio. Verifique a conexão e tente de novo.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <button
        type="button"
        className={`profile-img-edit ${className}`}
        onClick={() => inputRef.current?.click()}
        disabled={busy}
        aria-label={label}
        title={busy ? "Enviando…" : (error ?? label)}
      >
        <Icon name="pen-line" size={14} />
      </button>
      {error && (
        <span className="profile-img-error" role="alert">
          {error}
        </span>
      )}
      <input
        ref={inputRef}
        type="file"
        accept="image/png,image/jpeg,image/webp,image/heic,image/heif,image/*"
        hidden
        onChange={onPick}
      />
    </>
  );
}

/** Profile banner with an inline edit button for the owner. */
export function EditableBanner({
  bannerUrl,
  editable,
}: {
  bannerUrl: string | null;
  editable: boolean;
}) {
  return (
    <div
      className={`profile-banner${bannerUrl ? "" : " profile-banner-empty"}`}
      style={bannerUrl ? { backgroundImage: `url(${bannerUrl})` } : undefined}
    >
      {editable && (
        <EditButton
          endpoint={routes.api.profile.banner}
          label="Editar banner"
          className="profile-banner-edit"
          maxDim={1600}
        />
      )}
    </div>
  );
}

/** Profile avatar with an inline edit button for the owner. */
export function EditableAvatar({
  avatarUrl,
  initial,
  editable,
}: {
  avatarUrl: string | null;
  initial: string;
  editable: boolean;
}) {
  return (
    <div className="profile-avatar-wrap">
      <div className="profile-avatar profile-avatar-lg">
        {avatarUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={avatarUrl} alt="" />
        ) : (
          <span>{initial}</span>
        )}
      </div>
      {editable && (
        <EditButton
          endpoint={routes.api.profile.avatar}
          label="Editar avatar"
          className="profile-avatar-edit"
          maxDim={512}
        />
      )}
    </div>
  );
}
