import { env } from "@/lib/env";

const ANDROID_PACKAGE = "com.supermanhwa.app";

/**
 * Digital Asset Links: proves to Android that the Play Store app (a Trusted Web
 * Activity) owns this site, so it opens full screen without the browser bar.
 */
export function GET() {
  const fingerprints = (env.ANDROID_CERT_SHA256 ?? "")
    .split(",")
    .map((fingerprint) => fingerprint.trim())
    .filter(Boolean);

  return Response.json(
    fingerprints.length
      ? [
          {
            relation: ["delegate_permission/common.handle_all_urls"],
            target: {
              namespace: "android_app",
              package_name: ANDROID_PACKAGE,
              sha256_cert_fingerprints: fingerprints,
            },
          },
        ]
      : [],
    { headers: { "Cache-Control": "public, max-age=3600" } },
  );
}
