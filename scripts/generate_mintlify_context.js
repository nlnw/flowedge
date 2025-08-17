#!/usr/bin/env node

import { execSync } from "node:child_process";
import {
  existsSync,
  mkdirSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { basename, dirname, join } from "node:path";

const ROOT_DIR = process.cwd();
const CONTRACT_DIR_JSON = join(ROOT_DIR, "utils", "contractdir.json");
const OUTPUT_DIR = join(ROOT_DIR, "mintlify_context");
const GITIGNORE_FILE = join(ROOT_DIR, ".gitignore");

function ensureGitignoreHasMintlify() {
  try {
    const entry = "mintlify_context/";
    if (!existsSync(GITIGNORE_FILE)) {
      writeFileSync(GITIGNORE_FILE, `${entry}\n`);
      return;
    }
    const current = readFileSync(GITIGNORE_FILE, "utf8");
    if (!current.split(/\r?\n/).some((line) => line.trim() === entry)) {
      const content = current.endsWith("\n")
        ? `${current}${entry}\n`
        : `${current}\n${entry}\n`;
      writeFileSync(GITIGNORE_FILE, content);
    }
  } catch (err) {
    console.warn("Warning: could not update .gitignore:", err.message);
  }
}

function recreateOutputDir() {
  if (existsSync(OUTPUT_DIR)) {
    rmSync(OUTPUT_DIR, { recursive: true, force: true });
  }
  mkdirSync(OUTPUT_DIR, { recursive: true });
}

function loadContractDirectory() {
  if (!existsSync(CONTRACT_DIR_JSON)) {
    console.log("contractdir.json not found. Generating it first...");
    try {
      execSync("bun scripts/generate_contract_dir.js", { stdio: "inherit" });
    } catch (err) {
      console.error("Error running generate_contract_dir:", err.message);
      process.exit(1);
    }
  }

  try {
    const data = JSON.parse(readFileSync(CONTRACT_DIR_JSON, "utf8"));
    if (!Array.isArray(data)) {
      throw new Error("contractdir.json did not contain an array");
    }
    return data;
  } catch (err) {
    console.error("Failed to read utils/contractdir.json:", err.message);
    process.exit(1);
  }
}

function sanitizeFileName(name) {
  return name.replace(/[^a-zA-Z0-9_.-]/g, "_");
}

function ensureDirForFile(filePath) {
  const dir = dirname(filePath);
  if (!existsSync(dir)) {
    mkdirSync(dir, { recursive: true });
  }
}

function toFrontmatterValue(value) {
  if (value == null) return "";
  const str = String(value);
  // Escape double quotes in YAML string values
  return str.replace(/"/g, '\\"');
}

function generateMarkdown(contract) {
  const title = contract.name || "Unknown Contract";
  const description =
    contract.description ||
    `Documentation for ${contract.name} at ${contract.path}`;
  const tags =
    contract.metadata && Array.isArray(contract.metadata.tags)
      ? contract.metadata.tags
      : [];
  const addresses = contract.addresses || {};
  const originAddresses = contract.originAddresses || {};
  const abiJson = contract.abi ? JSON.stringify(contract.abi, null, 2) : null;
  const functionSigs = Array.isArray(contract.functionSignatures)
    ? contract.functionSignatures
    : [];

  const lines = [];
  lines.push("---");
  lines.push(`title: "${toFrontmatterValue(title)}"`);
  lines.push(`description: "${toFrontmatterValue(description)}"`);
  lines.push("---");
  lines.push("");

  lines.push("### Overview");
  lines.push("");
  lines.push(`- **name**: ${title}`);
  lines.push(`- **path**: \`${contract.path}\``);
  lines.push(`- **context**: ${contract.context || "general"}`);
  if (tags.length > 0) {
    lines.push(`- **tags**: ${tags.join(", ")}`);
  }
  if (
    contract.metadata &&
    (contract.metadata.title ||
      contract.metadata.notice ||
      contract.metadata.dev)
  ) {
    if (contract.metadata.title)
      lines.push(`- **title**: ${contract.metadata.title}`);
    if (contract.metadata.notice)
      lines.push(`- **notice**: ${contract.metadata.notice}`);
    if (contract.metadata.dev)
      lines.push(`- **dev**: ${contract.metadata.dev}`);
  }
  lines.push("");

  if (Object.keys(addresses).length > 0) {
    lines.push("### Addresses");
    lines.push("");
    for (const [network, addr] of Object.entries(addresses)) {
      if (!addr) continue;
      const href = networkAddressExplorerUrl(network, String(addr));
      const linked = href ? `[\`${addr}\`](${href})` : `\`${addr}\``;
      lines.push(`- **${network}**: ${linked}`);
    }
    lines.push("");
  }

  if (Object.keys(originAddresses).length > 0) {
    lines.push("### Origin addresses");
    lines.push("");
    for (const [network, entry] of Object.entries(originAddresses)) {
      if (!entry) continue;
      const { originChain, address } = normalizeOriginAddress(network, entry);
      const label = `${originChain} (${network})`;
      const href = originAddressExplorerUrl(originChain, address);
      const linked = href ? `[\`${address}\`](${href})` : `\`${address}\``;
      lines.push(`- **${network}**: ${label} – ${linked}`);
    }
    lines.push("");
  }

  if (functionSigs.length > 0) {
    lines.push("### Function signatures");
    lines.push("");
    lines.push("```");
    for (const sig of functionSigs) {
      const signature = typeof sig === "string" ? sig : sig.signature || "";
      if (signature) lines.push(signature);
    }
    lines.push("```");
    lines.push("");
  }

  if (abiJson) {
    lines.push("### ABI");
    lines.push("");
    lines.push("```json");
    lines.push(abiJson);
    lines.push("```");
    lines.push("");
  }

  return lines.join("\n");
}

function networkAddressExplorerUrl(network, address) {
  try {
    const lower = String(network).toLowerCase();
    if (lower === "tatara")
      return `https://explorer.tatara.katana.network/address/${address}`;
    if (lower === "bokuto")
      return `https://explorer-bokuto.katanarpc.com/address/${address}`;
    if (lower === "katana") return `https://katanascan.com/address/${address}`;
    return null;
  } catch {
    return null;
  }
}

function originAddressExplorerUrl(originChain, address) {
  const chain = String(originChain).toLowerCase();
  if (chain === "ethereum") return `https://etherscan.io/address/${address}`;
  if (chain === "sepolia")
    return `https://sepolia.etherscan.io/address/${address}`;
  return null;
}

function normalizeOriginAddress(network, entry) {
  // Returns { originChain, address }
  if (entry && typeof entry === "object") {
    const originChain =
      entry.originChain || inferOriginChainFromNetwork(network);
    const address = entry.address || "";
    return { originChain, address };
  }
  // entry is a string from ORIGIN_CONTRACT_ADDRESSES
  return {
    originChain: inferOriginChainFromNetwork(network),
    address: String(entry),
  };
}

function inferOriginChainFromNetwork(network) {
  const lower = String(network).toLowerCase();
  if (lower === "katana") return "ethereum";
  if (lower === "tatara") return "sepolia";
  if (lower === "bokuto") return "sepolia";
  return "ethereum";
}

function filePathForContract(contract) {
  // Mirror the contracts directory structure to avoid name collisions
  // Example: mintlify_context/contracts/vb/IMigrationManager.md
  const relativeDir = contract.relativePath ? contract.relativePath : "";
  const baseName = sanitizeFileName(`${contract.name}.md`);
  const fullDir = join(OUTPUT_DIR, relativeDir);
  return join(fullDir, baseName);
}

function main() {
  console.log("Generating Mintlify context markdown...");
  ensureGitignoreHasMintlify();
  recreateOutputDir();

  const contractDir = loadContractDirectory();
  let count = 0;

  for (const contract of contractDir) {
    const outPath = filePathForContract(contract);
    ensureDirForFile(outPath);
    const markdown = generateMarkdown(contract);
    writeFileSync(outPath, markdown, "utf8");
    count += 1;
  }

  // Add a simple index file for convenience
  try {
    const indexLines = [];
    indexLines.push("---");
    indexLines.push('title: "Contract Index"');
    indexLines.push('description: "Index of generated contract docs"');
    indexLines.push("---");
    indexLines.push("");
    indexLines.push("Generated contract documentation for Mintlify RAG.");
    writeFileSync(join(OUTPUT_DIR, "index.md"), indexLines.join("\n"), "utf8");
  } catch {}

  console.log(`✅ Wrote ${count} markdown files to ${OUTPUT_DIR}`);
}

main();
