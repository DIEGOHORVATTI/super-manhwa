const UA = "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 Chrome/124.0.0.0";
const H = { "User-Agent": UA, Accept: "application/json" };

// Comick known API hosts
const hosts = ["https://api.comick.fun", "https://api.comick.io"];

for (const base of hosts) {
  console.log(`\n========== ${base} ==========`);
  // 1. search
  try {
    const r = await fetch(`${base}/v1.0/search?q=solo+leveling&limit=3`, { headers: H, signal: AbortSignal.timeout(10000) });
    console.log(`search: [${r.status}] ct=${r.headers.get("content-type")}`);
    const txt = await r.text();
    if (r.ok && txt.trimStart().startsWith("[")) {
      const data = JSON.parse(txt);
      console.log(`  results: ${data.length}`);
      for (const m of data.slice(0,2)) console.log(`    ${m.title}  slug=${m.slug}  hid=${m.hid}`);
    } else {
      console.log(`  body[0:150]: ${txt.slice(0,150)}`);
    }
  } catch (e) { console.log(`  search ERR: ${(e as Error).message.slice(0,60)}`); }
}
