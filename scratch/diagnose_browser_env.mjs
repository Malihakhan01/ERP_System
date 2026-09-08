// scratch/diagnose_browser_env.mjs
// Diagnostic script for Playwright, installed browsers (Chrome, Edge), and browser launch testing

import fs from "fs";
import os from "os";
import path from "path";
import { execSync } from "child_process";

console.log("================================================================================");
console.log("FACTORYOS ERP — PLAYWRIGHT & BROWSER AUTOMATION DIAGNOSTIC");
console.log("================================================================================");

// 1. Operating System
console.log(`OS Platform:     ${os.platform()} (${os.type()} ${os.release()})`);
console.log(`OS Arch:         ${os.arch()}`);

// 2. Node & NPM
console.log(`Node.js Version: ${process.version}`);
try {
  const npmVer = execSync("npm --version", { encoding: "utf-8" }).trim();
  console.log(`NPM Version:     ${npmVer}`);
} catch (e) {
  console.log(`NPM Version:     Error (${e.message})`);
}

// 3. Package.json Playwright inspection
try {
  const pkg = JSON.parse(fs.readFileSync("package.json", "utf-8"));
  const devDeps = pkg.devDependencies || {};
  const deps = pkg.dependencies || {};
  console.log(`Playwright in dependencies:     ${deps["@playwright/test"] || deps["playwright"] || "None"}`);
  console.log(`Playwright in devDependencies:  ${devDeps["@playwright/test"] || devDeps["playwright"] || "None"}`);
} catch (e) {
  console.log(`package.json read error: ${e.message}`);
}

// 4. Detect installed Chrome and Edge paths on Windows
const possiblePaths = {
  chrome: [
    "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
    "C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe",
    path.join(os.homedir(), "AppData\\Local\\Google\\Chrome\\Application\\chrome.exe"),
  ],
  edge: [
    "C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe",
    "C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe",
    path.join(os.homedir(), "AppData\\Local\\Microsoft\\Edge\\Application\\msedge.exe"),
  ],
};

let detectedChrome = null;
for (const p of possiblePaths.chrome) {
  if (fs.existsSync(p)) {
    detectedChrome = p;
    break;
  }
}

let detectedEdge = null;
for (const p of possiblePaths.edge) {
  if (fs.existsSync(p)) {
    detectedEdge = p;
    break;
  }
}

console.log(`Google Chrome:   ${detectedChrome ? `Detected at ${detectedChrome}` : "Not Detected"}`);
console.log(`Microsoft Edge:  ${detectedEdge ? `Detected at ${detectedEdge}` : "Not Detected"}`);

console.log("================================================================================");
