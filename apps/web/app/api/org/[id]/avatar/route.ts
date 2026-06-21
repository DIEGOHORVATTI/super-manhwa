import { uploadOrgImage } from "@/lib/org-upload";

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return uploadOrgImage(req, id, "avatar");
}
