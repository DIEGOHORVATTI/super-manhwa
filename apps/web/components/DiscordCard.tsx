import { Icon } from "@/components/Icon";

/**
 * Call-to-action banner inviting visitors to the Discord server. Renders nothing
 * unless `NEXT_PUBLIC_DISCORD_URL` is set, so the feature is fully optional.
 */
export function DiscordCard() {
  const url = process.env.NEXT_PUBLIC_DISCORD_URL;
  if (!url) return null;
  return (
    <a className="discord-card" href={url} target="_blank" rel="noopener noreferrer">
      <span className="discord-card-icon">
        <Icon name="sparkles" size={22} />
      </span>
      <span className="discord-card-text">
        <strong>Entre no nosso Discord</strong>
        <span>Converse com a comunidade, peça obras e fique por dentro dos lançamentos.</span>
      </span>
      <span className="discord-card-cta">
        Entrar <Icon name="arrow-right" size={16} />
      </span>
    </a>
  );
}
