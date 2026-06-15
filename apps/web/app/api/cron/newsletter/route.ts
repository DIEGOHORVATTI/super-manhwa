import type { MangaSummary } from "@packages/contracts";
import { env } from "@/lib/env";
import { render } from "@react-email/render";
import { type DigestItem, NewsletterDigestEmail } from "@packages/emails";
import { dbEnabled } from "@/lib/db";
import { emailEnabled, sendEmail } from "@/lib/email";
import { api } from "@/lib/orpc.server";
import { subscribersRepo } from "@/lib/repositories/subscribers";
import { mangaHref } from "@/lib/slug";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

/**
 * Weekly newsletter digest. Triggered by Vercel Cron (see vercel.json). Guarded
 * by CRON_SECRET | Vercel sends it as `Authorization: Bearer <secret>`. Builds a
 * trending/new digest (React Email template) and sends to confirmed subscribers,
 * each with a personal unsubscribe link.
 */
const base = env.SITE_URL;

const toItem = (m: MangaSummary): DigestItem => ({
  title: m.name,
  imageUrl: m.imageUrl ? `${base}${m.imageUrl}` : undefined,
  link: `${base}${mangaHref(m.id, m.name)}`,
});

export async function GET(req: Request): Promise<Response> {
  const secret = env.CRON_SECRET;
  if (secret && req.headers.get("authorization") !== `Bearer ${secret}`) {
    return Response.json({ ok: false }, { status: 401 });
  }
  if (!dbEnabled || !emailEnabled) {
    return Response.json({ ok: false, reason: "unconfigured" }, { status: 503 });
  }

  const [trending, newest] = await Promise.all([
    api.manga.popular({ lang: "pt-br", sort: "trending", page: 1 }).catch(() => ({ list: [] })),
    api.manga.popular({ lang: "pt-br", sort: "newest", page: 1 }).catch(() => ({ list: [] })),
  ]);
  const trendingItems = trending.list.slice(0, 6).map(toItem);
  const newestItems = newest.list.slice(0, 6).map(toItem);

  const subs = await subscribersRepo.listConfirmed();

  let sent = 0;
  for (const sub of subs) {
    try {
      const html = await render(
        NewsletterDigestEmail({
          trending: trendingItems,
          newest: newestItems,
          browseUrl: `${base}/`,
          unsubscribeUrl: `${base}/api/newsletter/unsubscribe?token=${sub.token}`,
        }),
      );
      await sendEmail({ to: sub.email, subject: "Super Manhwa | destaques da semana", html });
      sent++;
    } catch {
      /* skip individual failures */
    }
  }

  return Response.json({ ok: true, sent, total: subs.length });
}
