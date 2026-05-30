import "server-only";

import { getDb, schema } from "@/lib/db";

/** Data access for DMCA/contact submissions (`legal_requests` table). */
export const legalRequestsRepo = {
  async create(type: "dmca" | "contact", payload: unknown): Promise<void> {
    await getDb()
      .insert(schema.legalRequests)
      .values({ type, payload: JSON.stringify(payload) });
  },
};
