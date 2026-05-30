import { confirmToken } from "@/lib/newsletter";

export async function GET(req: Request): Promise<Response> {
  const token = new URL(req.url).searchParams.get("token") ?? "";
  const ok = token ? await confirmToken(token).catch(() => false) : false;
  const url = new URL(`/newsletter?status=${ok ? "confirmado" : "invalido"}`, req.url);
  return Response.redirect(url, 303);
}
