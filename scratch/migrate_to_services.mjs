import fs from "fs";
import path from "path";

const rootDir = process.cwd();
const dbDir = path.join(rootDir, "lib", "database");
const servicesDir = path.join(rootDir, "lib", "services");

if (!fs.existsSync(servicesDir)) {
  fs.mkdirSync(servicesDir, { recursive: true });
}

// Mapping of database file names to services file names
const fileMapping = {
  "advances-db.ts": "advances-service.ts",
  "ai-mockup-db.ts": "ai-mockup-service.ts",
  "clients-db.ts": "clients-service.ts",
  "costing-db.ts": "costing-service.ts",
  "dispatch-db.ts": "dispatch-service.ts",
  "employees-db.ts": "employees-service.ts",
  "financial-reconciliation-db.ts": "financial-service.ts",
  "finishing-db.ts": "finishing-service.ts",
  "inventory-db.ts": "inventory-service.ts",
  "invoices-db.ts": "invoices-service.ts",
  "materials-db.ts": "materials-service.ts",
  "orders-db.ts": "orders-service.ts",
  "packing-db.ts": "packing-service.ts",
  "payroll-db.ts": "payroll-service.ts",
  "production-db.ts": "production-service.ts",
  "products-db.ts": "products-service.ts",
  "purchases-db.ts": "purchases-service.ts",
  "qa-db.ts": "qa-service.ts",
  "quotations-db.ts": "quotations-service.ts",
  "reports-db.ts": "reports-service.ts",
  "settings-db.ts": "settings-service.ts",
  "tracking-db.ts": "tracking-service.ts",
};

console.log("1. Copying and transforming files into lib/services/...");

for (const [dbFile, serviceFile] of Object.entries(fileMapping)) {
  const srcPath = path.join(dbDir, dbFile);
  const destPath = path.join(servicesDir, serviceFile);

  if (!fs.existsSync(srcPath)) continue;

  let content = fs.readFileSync(srcPath, "utf-8");

  // Replace internal relative imports
  for (const [sFile, dFile] of Object.entries(fileMapping)) {
    const sBase = sFile.replace(/\.ts$/, "");
    const dBase = dFile.replace(/\.ts$/, "");
    
    // Replace `./advances-db` with `./advances-service`
    content = content.replaceAll(`./${sBase}`, `./${dBase}`);
    // Replace `@/lib/services/advances-db` with `@/lib/services/advances-service`
    content = content.replaceAll(`@/lib/services/${sBase}`, `@/lib/services/${dBase}`);
  }

  // Update header comment if present
  content = content.replace(
    /\/\/ lib\/database\/[a-zA-Z0-9_-]+\.ts/,
    `// lib/services/${serviceFile}`
  );

  fs.writeFileSync(destPath, content, "utf-8");
  console.log(`Created: lib/services/${serviceFile}`);
}

// 2. Create lib/services/index.ts
console.log("2. Creating lib/services/index.ts...");
let indexContent = `/**
 * FactoryOS Unified Client Services & Domain Types Layer
 */\n\n`;

for (const serviceFile of Object.values(fileMapping)) {
  const baseName = serviceFile.replace(/\.ts$/, "");
  indexContent += `export * from "./${baseName}";\n`;
}

fs.writeFileSync(path.join(servicesDir, "index.ts"), indexContent, "utf-8");
console.log("Created: lib/services/index.ts");

// 3. Create compatibility re-export wrappers in lib/services/
console.log("3. Creating backward-compatibility wrappers in lib/services/...");
for (const [dbFile, serviceFile] of Object.entries(fileMapping)) {
  const targetPath = path.join(dbDir, dbFile);
  const serviceBase = serviceFile.replace(/\.ts$/, "");
  const wrapperContent = `/**
 * Backward compatibility re-export wrapper.
 * Recommended: Import directly from '@/lib/services/${serviceBase}'
 */
export * from "../services/${serviceBase}";
`;
  fs.writeFileSync(targetPath, wrapperContent, "utf-8");
  console.log(`Updated wrapper: lib/services/${dbFile}`);
}

console.log("Migration complete!");
