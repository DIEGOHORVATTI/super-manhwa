/**
 * Generates the Android (Trusted Web Activity) Gradle project from twa-manifest.json.
 * Runs in CI only: `node generate.cjs <outDir> <versionCode>`.
 */
const path = require("node:path");
const { ConsoleLog, TwaGenerator, TwaManifest } = require("@bubblewrap/core");

async function main() {
  const [outDir, versionCode] = process.argv.slice(2);
  const manifest = await TwaManifest.fromFile(path.join(__dirname, "twa-manifest.json"));
  manifest.appVersionCode = Number(versionCode);
  manifest.appVersionName = `1.0.${versionCode}`;
  await new TwaGenerator().createTwaProject(path.resolve(outDir), manifest, new ConsoleLog("twa"));
  console.log(`versionCode ${manifest.appVersionCode}, versionName ${manifest.appVersionName}`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
