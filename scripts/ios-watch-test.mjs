#!/usr/bin/env node
/**
 * Build the iOS app + its watchOS companion and run both in paired simulators,
 * so it can be tested before archiving in Xcode. macOS + Xcode only.
 *
 *   node scripts/ios-watch-test.mjs                  # Release build vs the TEST server
 *   node scripts/ios-watch-test.mjs --skip-prebuild  # native code unchanged: much faster
 *   node scripts/ios-watch-test.mjs --archive-check  # pre-archive safety checks only
 *
 * Why Release by default: it embeds the JS bundle, so there is no Metro / dev
 * server / port to fight with, and it is the configuration you archive.
 * `--dev` builds Debug and starts Metro instead (hot reload) — see --help.
 *
 * Deliberately uses xcodebuild + simctl only: no `expo run:ios`, and nothing
 * that needs Simulator.app to be registered with macOS (it is not, on Xcode 27).
 */
import { spawnSync, spawn } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const WORKSPACE = "ios/OBHInvites.xcworkspace";
const PBXPROJ = "ios/OBHInvites.xcodeproj/project.pbxproj";
const SCHEME = "OBHInvites";
const APP_ID = "com.falcon83.obhinvites";
const WATCH_ID = "com.falcon83.obhinvites.watch";
const PROD_API = "https://invites.falcon83.com";
const TEST_API = "https://test-invites.falcon83.com";
const PHONE_NAME = "OBH-Test iPhone";
const WATCH_NAME = "OBH-Test Watch";

// ---------------------------------------------------------------- pure logic

export function parseArgs(argv) {
  const o = {
    api: TEST_API, dev: false, port: 8090, skipPrebuild: false, skipBuild: false,
    reset: false, solo: false, archiveCheck: false, iphone: "", help: false,
  };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === "--api") o.api = argv[++i];
    else if (a === "--prod") o.api = PROD_API;
    else if (a === "--dev") o.dev = true;
    else if (a === "--port") o.port = Number(argv[++i]);
    else if (a === "--skip-prebuild") o.skipPrebuild = true;
    else if (a === "--skip-build") o.skipBuild = true;
    else if (a === "--reset") o.reset = true;
    else if (a === "--solo") o.solo = true;
    else if (a === "--archive-check") o.archiveCheck = true;
    else if (a === "--iphone") o.iphone = argv[++i];
    else if (a === "--help" || a === "-h") o.help = true;
    else throw new Error(`Unknown option: ${a} (try --help)`);
  }
  return o;
}

/** "18.0" vs "17.5.1" -> numeric compare. */
export function versionCompare(a, b) {
  const pa = String(a).split(".").map(Number);
  const pb = String(b).split(".").map(Number);
  for (let i = 0; i < Math.max(pa.length, pb.length); i++) {
    const d = (pa[i] || 0) - (pb[i] || 0);
    if (d) return d;
  }
  return 0;
}

function runtimePlatform(rt) {
  if (rt.platform) return rt.platform;
  const m = /SimRuntime\.([A-Za-z]+)-/.exec(rt.identifier || "");
  return m ? m[1] : "";
}

/** Available runtimes for a platform ("iOS" | "watchOS"), newest first. */
export function runtimesFor(runtimes, platform) {
  return runtimes
    .filter((r) => r.isAvailable !== false && runtimePlatform(r) === platform)
    .sort((a, b) => versionCompare(b.version, a.version));
}

const num = (s) => Number((/(\d+)/.exec(s) || [0, 0])[1]);

/** Newest plain/Pro iPhone a runtime supports (skips Max/Plus/Air/mini/SE/e). */
export function pickIphoneType(runtime) {
  const types = (runtime.supportedDeviceTypes || []).filter(
    (t) => /^iPhone/.test(t.name) && !/Max|Plus|Air|mini|SE|\d+e\b/.test(t.name),
  );
  types.sort((a, b) => num(b.name) - num(a.name) || (/Pro/.test(b.name) ? 1 : 0) - (/Pro/.test(a.name) ? 1 : 0));
  return types[0] || null;
}

/** Newest Apple Watch Series a runtime supports, else any watch. */
export function pickWatchType(runtime) {
  const types = (runtime.supportedDeviceTypes || []).filter((t) => /^Apple Watch/.test(t.name));
  types.sort((a, b) => (/Series/.test(b.name) ? 1 : 0) - (/Series/.test(a.name) ? 1 : 0) || num(b.name) - num(a.name));
  return types[0] || null;
}

/**
 * An existing usable iPhone+Watch pair from `simctl list -j pairs`, preferring
 * ones we created earlier, then one matching --iphone. Both devices must still
 * exist and be available.
 */
export function pickPair(pairs, devices, iphoneHint = "") {
  const available = new Map();
  for (const list of Object.values(devices)) for (const d of list) if (d.isAvailable !== false) available.set(d.udid, d);
  const usable = Object.values(pairs || {})
    .filter((p) => p.phone && p.watch && available.has(p.phone.udid) && available.has(p.watch.udid))
    .map((p) => ({ phone: available.get(p.phone.udid), watch: available.get(p.watch.udid) }));
  const score = (p) =>
    (p.phone.name.startsWith("OBH-Test") ? 2 : 0) + (iphoneHint && p.phone.name.includes(iphoneHint) ? 4 : 0);
  usable.sort((a, b) => score(b) - score(a));
  return usable[0] || null;
}

/** Effective EXPO_PUBLIC_API_URL an Xcode *Archive* would bake in (NODE_ENV=production). */
export function resolveArchiveApi(files) {
  // Expo/dotenv-flow precedence, highest first. `files` = { name: text }.
  const order = [".env.production.local", ".env.local", ".env.production", ".env"];
  for (const name of order) {
    const m = /^\s*EXPO_PUBLIC_API_URL\s*=\s*(.+?)\s*$/m.exec(files[name] || "");
    if (m) return { file: name, url: m[1].replace(/^["']|["']$/g, "") };
  }
  return null;
}

/**
 * One record per build configuration in the generated project.pbxproj:
 * { bundleId, version, build, team, family }. Configs without a bundle id
 * (project-level, Pods) are dropped.
 */
export function scanPbxproj(text) {
  const get = (block, key) => {
    const m = new RegExp(`\\b${key} = ("?)([^";\\n]+)\\1;`).exec(block);
    return m ? m[2] : null;
  };
  return text
    .split("isa = XCBuildConfiguration;")
    .slice(1)
    .map((block) => ({
      bundleId: get(block, "PRODUCT_BUNDLE_IDENTIFIER"),
      version: get(block, "MARKETING_VERSION"),
      build: get(block, "CURRENT_PROJECT_VERSION"),
      team: get(block, "DEVELOPMENT_TEAM"),
      family: get(block, "TARGETED_DEVICE_FAMILY"),
    }))
    .filter((c) => c.bundleId);
}

/** CFBundleVersion / CFBundleShortVersionString literals from the phone app's Info.plist. */
export function scanInfoPlist(text) {
  const get = (key) => new RegExp(`<key>${key}</key>\\s*<string>([^<]*)</string>`).exec(text)?.[1] ?? null;
  return { build: get("CFBundleVersion"), version: get("CFBundleShortVersionString") };
}

// ------------------------------------------------------------------- helpers

const log = (m = "") => console.log(m);
const step = (m) => console.log(`\n▶ ${m}`);
function die(msg, hint) {
  console.error(`\n✖ ${msg}`);
  if (hint) console.error(`  ${hint}`);
  process.exit(1);
}

function sh(cmd, args, opts = {}) {
  const r = spawnSync(cmd, args, { cwd: ROOT, encoding: "utf8", maxBuffer: 64 * 1024 * 1024, ...opts });
  return { ok: r.status === 0, out: (r.stdout || "").trim(), err: (r.stderr || "").trim(), status: r.status };
}
function shOrDie(cmd, args, what, opts) {
  const r = sh(cmd, args, opts);
  if (!r.ok) die(`${what} failed`, r.err || r.out);
  return r.out;
}
const simctlJson = (...a) => JSON.parse(shOrDie("xcrun", ["simctl", "list", "-j", ...a], `simctl list ${a.join(" ")}`));

// --------------------------------------------------------------------- steps

function preflight(o) {
  if (process.platform !== "darwin") die("This only runs on a Mac with Xcode.");
  const xp = sh("xcode-select", ["-p"]);
  if (!xp.ok || !/Xcode.*\.app\/Contents\/Developer/.test(xp.out))
    die(`xcode-select points at "${xp.out}", not a full Xcode.`, "Fix: sudo xcode-select -s /Applications/Xcode.app/Contents/Developer");
  const xv = sh("xcodebuild", ["-version"]);
  if (!xv.ok) die("xcodebuild doesn't work.", "Run: sudo xcodebuild -license accept && xcodebuild -runFirstLaunch");
  log(`Xcode: ${xv.out.split("\n").join(" / ")}`);
  if (!fs.existsSync(path.join(ROOT, "node_modules"))) {
    step("npm install");
    if (!sh("npm", ["install"], { stdio: "inherit" }).ok) die("npm install failed");
  }
  log(`API baked into this build: ${o.api}${o.api === PROD_API ? "   (PRODUCTION - real data!)" : ""}`);
}

function prebuild(o) {
  const has = fs.existsSync(path.join(ROOT, WORKSPACE));
  if (o.skipPrebuild && has) return log("Skipping prebuild (--skip-prebuild).");
  step("expo prebuild --clean  (regenerates ios/; always --clean, a non-clean run breaks the watch targets)");
  const r = sh("npx", ["expo", "prebuild", "--platform", "ios", "--clean"], { stdio: "inherit", env: { ...process.env, EXPO_PUBLIC_API_URL: o.api } });
  if (!r.ok) die("expo prebuild failed", "If it's CocoaPods: brew install cocoapods, then re-run.");
}

function ensurePair(o) {
  step("Simulators (paired iPhone + Apple Watch)");
  let { pairs } = simctlJson("pairs");
  const { devices } = simctlJson("devices");
  let pair = pickPair(pairs, devices, o.iphone);
  if (!pair) pair = createPair();
  log(`iPhone: ${pair.phone.name} (${pair.phone.udid})`);
  log(`Watch : ${pair.watch.name} (${pair.watch.udid})`);
  if (o.reset) {
    log("Resetting both simulators (erases app data and logins)...");
    for (const d of [pair.phone, pair.watch]) { sh("xcrun", ["simctl", "shutdown", d.udid]); sh("xcrun", ["simctl", "erase", d.udid]); }
  }
  for (const d of [pair.phone, pair.watch]) {
    const r = sh("xcrun", ["simctl", "bootstatus", d.udid, "-b"]);
    if (!r.ok) die(`Couldn't boot ${d.name}`, r.err || r.out);
  }
  // Other booted simulators are how you end up staring at the wrong device (an
  // old Debug build on a different iPhone looks exactly like this app failing).
  const others = Object.values(simctlJson("devices").devices).flat()
    .filter((d) => d.state === "Booted" && d.udid !== pair.phone.udid && d.udid !== pair.watch.udid);
  if (others.length && o.solo) {
    for (const d of others) sh("xcrun", ["simctl", "shutdown", d.udid]);
    log(`Shut down other simulators: ${others.map((d) => d.name).join(", ")}`);
  } else if (others.length) {
    log(`\n!! Other simulators are also booted: ${others.map((d) => d.name).join(", ")}`);
    log("   Make sure you're looking at the one below, or re-run with --solo to shut the others down.");
  }
  log(`\n>>> TEST ON: "${pair.phone.name}" + "${pair.watch.name}" <<<`);
  // Best effort only: on Xcode 27 Simulator.app may not be registered. Booted sims still work.
  if (!sh("open", ["-a", "Simulator"]).ok) log("(Could not open Simulator.app - fine, the simulators are booted; view them from Xcode.)");
  return pair;
}

function createPair() {
  log("No paired iPhone+Watch simulators found - creating a pair...");
  const { runtimes } = simctlJson("runtimes");
  const phones = runtimesFor(runtimes, "iOS");
  const watches = runtimesFor(runtimes, "watchOS");
  if (!phones.length) die("No iOS simulator runtime installed.", "Xcode > Settings > Components: download the iOS simulator.");
  if (!watches.length) die("No watchOS simulator runtime installed.", "Xcode > Settings > Components: download the watchOS simulator.");
  for (const pr of phones) for (const wr of watches) {
    const pt = pickIphoneType(pr), wt = pickWatchType(wr);
    if (!pt || !wt) continue;
    const phone = sh("xcrun", ["simctl", "create", PHONE_NAME, pt.identifier, pr.identifier]);
    const watch = sh("xcrun", ["simctl", "create", WATCH_NAME, wt.identifier, wr.identifier]);
    if (phone.ok && watch.ok && sh("xcrun", ["simctl", "pair", watch.out, phone.out]).ok)
      return { phone: { name: `${PHONE_NAME} (${pt.name}, ${pr.name})`, udid: phone.out }, watch: { name: `${WATCH_NAME} (${wt.name}, ${wr.name})`, udid: watch.out } };
    if (phone.ok) sh("xcrun", ["simctl", "delete", phone.out]);
    if (watch.ok) sh("xcrun", ["simctl", "delete", watch.out]);
  }
  die("Couldn't pair any iPhone/Watch runtime combination.", "Install a matching iOS + watchOS simulator pair in Xcode > Settings > Components.");
}

function build(o, pair) {
  const config = o.dev ? "Debug" : "Release";
  step(`xcodebuild (${config}) - builds the phone app, watch app and complication; a few minutes`);
  fs.mkdirSync(path.join(ROOT, "ios/build"), { recursive: true });
  const logPath = path.join(ROOT, "ios/build/xcodebuild.log");
  const fd = fs.openSync(logPath, "w");
  const r = spawnSync("xcodebuild", [
    "-workspace", WORKSPACE, "-scheme", SCHEME, "-configuration", config,
    "-destination", `id=${pair.phone.udid}`, "-derivedDataPath", "ios/build", "build",
  ], { cwd: ROOT, stdio: ["ignore", fd, fd], env: { ...process.env, EXPO_PUBLIC_API_URL: o.api } });
  fs.closeSync(fd);
  if (r.status !== 0) {
    const text = fs.readFileSync(logPath, "utf8");
    const errs = text.split("\n").filter((l) => /error:/.test(l)).slice(0, 15);
    die(`Build failed (full log: ${logPath})`, errs.length ? "\n  " + errs.join("\n  ") : text.split("\n").slice(-25).join("\n"));
  }
  log(`Build OK. Log: ${logPath}`);
  return path.join(ROOT, `ios/build/Build/Products/${config}-iphonesimulator`);
}

function findApp(dir, bundleId) {
  if (!fs.existsSync(dir)) return null;
  for (const name of fs.readdirSync(dir).filter((n) => n.endsWith(".app"))) {
    const r = sh("plutil", ["-extract", "CFBundleIdentifier", "raw", "-o", "-", path.join(dir, name, "Info.plist")]);
    if (r.ok && r.out === bundleId) return path.join(dir, name);
  }
  return null;
}

const sleep = (s) => sh("sleep", [String(s)]);

function install(pair, productsDir) {
  step("Install");
  const app = findApp(productsDir, APP_ID);
  if (!app) die(`Built app (${APP_ID}) not found in ${productsDir}`, "There is no build of that kind on disk yet. Re-run without --skip-build (a --dev run only leaves a Debug build; a normal run leaves a Release one).");
  shOrDie("xcrun", ["simctl", "install", pair.phone.udid, app], "Installing the iPhone app");
  log(`iPhone app installed: ${path.basename(app)}`);
  // Always install the embedded watch app ourselves. Installing the phone app
  // is supposed to update the companion on the paired watch, but that's slow and
  // unreliable, and "the watch app is already there" used to mean a STALE
  // watch app kept running after a rebuild (new watch code never showed up).
  const embedded = findApp(path.join(app, "Watch"), WATCH_ID);
  if (!embedded) die("The watch app isn't embedded in the phone app.", "Re-run without --skip-prebuild.");
  shOrDie("xcrun", ["simctl", "install", pair.watch.udid, embedded], "Installing the watch app");
  log(`Watch app installed: ${path.basename(embedded)}`);
}

function launch(o, pair) {
  step("Launch");
  sh("xcrun", ["simctl", "terminate", pair.phone.udid, APP_ID]);
  sh("xcrun", ["simctl", "terminate", pair.watch.udid, WATCH_ID]);
  sh("xcrun", ["simctl", "spawn", pair.phone.udid, "defaults", "delete", APP_ID, "RCT_jsLocation"]);
  shOrDie("xcrun", ["simctl", "launch", pair.phone.udid, APP_ID], "Launching the iPhone app");
  if (o.dev) {
    // A Debug build of this app opens the Expo dev *launcher* ("No development servers found"),
    // not the app, until it's told where Metro is. Best-effort deep link; the URL below is the manual fallback.
    const url = `http://localhost:${o.port}`;
    sleep(3);
    sh("xcrun", ["simctl", "openurl", pair.phone.udid, `exp+jvmalone://expo-development-client/?url=${encodeURIComponent(url)}`]);
    log(`Dev mode: if the phone shows the launcher ("No development servers found"), tap "Enter URL manually" and enter ${url}`);
  }
  if (!sh("xcrun", ["simctl", "launch", pair.watch.udid, WATCH_ID]).ok) log("(Watch app didn't auto-launch; open it from the watch simulator.)");
}

function checklist(o) {
  log(`
================ What to check ================
1. iPhone: the login screen appears. Log in with a TEST account${o.api === PROD_API ? " (this build is PRODUCTION - be careful)" : ""}.
2. Watch: it shows the next skate, or the gold hockey-figure "No OBH Skate Scheduled" screen.
   (First sync needs the phone app logged in and open. Simulator reachability is flaky - retry once.)
3. Complication: in the watch simulator long-press the face > Edit > swipe to Complications > tap a slot > "OBH Invites".
4. Nothing crashed on launch. Logs: xcrun simctl spawn booted log stream --predicate 'process == "OBHInvites"'
Re-run fast after JS/Swift changes:  npm run ios:test -- --skip-prebuild
Before archiving:                    npm run ios:test -- --archive-check
===============================================`);
}

function archiveCheck() {
  step("Pre-archive checks");
  let bad = 0;
  const flag = (ok, msg) => { log(`${ok ? "  ok " : "  !! "} ${msg}`); if (!ok) bad++; };
  const read = (n) => (fs.existsSync(path.join(ROOT, n)) ? fs.readFileSync(path.join(ROOT, n), "utf8") : "");

  const files = Object.fromEntries([".env", ".env.production", ".env.local", ".env.production.local"].map((n) => [n, read(n)]));
  const api = resolveArchiveApi(files);
  flag(api ? api.url === PROD_API : true,
    api ? `An Archive bakes in EXPO_PUBLIC_API_URL=${api.url} (from ${api.file})${api.url === PROD_API ? "" : "  <-- NOT production!  Delete/rename that line or file before archiving."}`
        : `No .env override: an Archive uses app.json extra.apiUrl (${PROD_API})`);

  const app = JSON.parse(read("app.json")).expo;
  log(`  --  app.json: version ${app.version}, iOS buildNumber ${app.ios?.buildNumber}`);
  if (!fs.existsSync(path.join(ROOT, PBXPROJ))) return die("ios/ isn't generated.", "Run: npm run ios:test  (or: npx expo prebuild --platform ios --clean)");
  const cfgs = scanPbxproj(read(PBXPROJ));
  const phone = scanInfoPlist(read("ios/OBHInvites/Info.plist"));
  log(`  --  phone app Info.plist: version ${phone.version}, build ${phone.build}  (from app.json)`);
  flag(phone.version === app.version && phone.build === String(app.ios?.buildNumber),
    `Phone app matches app.json (${app.version} / ${app.ios?.buildNumber})`);
  const embedded = cfgs.filter((c) => c.bundleId !== APP_ID); // watch app + complication
  flag(embedded.length > 0 && embedded.every((c) => c.version === phone.version && c.build === phone.build),
    `Watch app + complication use the same version/build as the phone app: ${[...new Set(embedded.map((c) => `${c.version}/${c.build}`))].join(", ")}`);
  const teams = [...new Set(cfgs.map((c) => c.team).filter(Boolean))];
  flag(teams.length === 1, `Signing team: ${teams.join(", ") || "none set"}`);
  const ids = [...new Set(cfgs.map((c) => c.bundleId))];
  flag(ids.includes(APP_ID) && ids.includes(WATCH_ID) && ids.includes(`${WATCH_ID}.widget`), `Bundle IDs nest correctly: ${ids.join(", ")}`);
  const fam = [...new Set(embedded.map((c) => c.family))];
  flag(fam.length === 1 && fam[0] === "4", `Watch targets are Apple Watch only (TARGETED_DEVICE_FAMILY ${fam.join(", ")}; want 4)`);
  log("  --  Remember: App Store Connect needs the build number higher than your last upload (bump app.json ios.buildNumber, then re-prebuild).");
  log(bad ? `\n${bad} problem(s) - fix before archiving.` : `\nAll good. In Xcode: scheme "${SCHEME}", destination "Any iOS Device (arm64)", Product > Archive.`);
  process.exit(bad ? 1 : 0);
}

const HELP = `
Usage: node scripts/ios-watch-test.mjs [options]     (or: npm run ios:test -- [options])

  (none)            Release build against the TEST server, install phone + watch, launch both
  --skip-prebuild   Reuse ios/ (use when only JS/Swift changed - much faster)
  --skip-build      Just reinstall + relaunch the last build
  --reset           Erase both simulators first (clears logins/app data)
  --solo            Shut down every other booted simulator (so only the tested pair is running)
  --api <url>       Server baked into the build (default ${TEST_API})
  --prod            Same as --api ${PROD_API}
  --iphone <name>   Prefer an existing simulator pair whose iPhone name contains this
  --dev             Debug build + Metro for hot reload (--port, default 8090). The phone opens the Expo launcher: tap "Enter URL manually" and enter http://localhost:8090. NOT for pre-archive testing
  --archive-check   Only run the pre-archive safety checks
`;

async function main() {
  const o = parseArgs(process.argv.slice(2));
  if (o.help) return log(HELP);
  if (o.archiveCheck) return archiveCheck();
  preflight(o);
  prebuild(o);
  const pair = ensurePair(o);
  const products = o.skipBuild
    ? path.join(ROOT, `ios/build/Build/Products/${o.dev ? "Debug" : "Release"}-iphonesimulator`)
    : build(o, pair);
  install(pair, products);
  launch(o, pair);
  checklist(o);
  if (o.dev) {
    step(`Metro on :${o.port} - press Cmd+R in the simulator when it says ready (Ctrl+C to stop)`);
    spawn("npx", ["expo", "start", "--dev-client", "--port", String(o.port)], { cwd: ROOT, stdio: "inherit" });
  }
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main().catch((e) => die(e.message));
}
