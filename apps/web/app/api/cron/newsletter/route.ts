import type { NovelSummary } from "@/lib/catalog";
import { env } from "@/lib/env";
import { render } from "@react-email/render";
import { type DigestItem, NewsletterDigestEmail } from "@packages/emails";
import { dbEnabled } from "@/lib/db";
import { emailEnabled, sendEmail } from "@/lib/email";
import { browseNovels } from "@/lib/catalog";
import { subscribersRepo } from "@/lib/repositories/subscribers";
import { routes } from "@/lib/routes";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

/**
 * Weekly newsletter digest. Triggered by Vercel Cron (see vercel.json). Guarded
 * by CRON_SECRET | Vercel sends it as `Authorization: Bearer <secret>`. Builds a
 * trending/new digest (React Email template) and sends to confirmed subscribers,
 * each with a personal unsubscribe link.
 */
const base = env.SITE_URL;

const toItem = (novel: NovelSummary): DigestItem => ({
  title: novel.title,
  imageUrl: novel.cover,
  link: `${base}${routes.novel(novel.slug)}`,
  description: novel.excerpt,
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
    browseNovels({ sort: "update" }).catch(() => ({ list: [] })),
    browseNovels({ sort: "latest" }).catch(() => ({ list: [] })),
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
          browseUrl: `${base}${routes.home}`,
          unsubscribeUrl: `${base}${routes.api.newsletter.unsubscribe}?token=${sub.token}`,
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
