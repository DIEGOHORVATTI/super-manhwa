import { unsubscribeToken } from "@/lib/newsletter";
import { routes } from "@/lib/routes";

export async function GET(req: Request): Promise<Response> {
  const token = new URL(req.url).searchParams.get("token") ?? "";
  const ok = token ? await unsubscribeToken(token).catch(() => false) : false;
  const url = new URL(`${routes.newsletter}?status=${ok ? "cancelado" : "invalido"}`, req.url);
  return Response.redirect(url, 303);
}
