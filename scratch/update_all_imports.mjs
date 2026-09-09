import fs from "fs";
import path from "path";

const rootDir = process.cwd();

const fileMapping = {
  "advances-db": "advances-service",
  "ai-mockup-db": "ai-mockup-service",
  "clients-db": "clients-service",
  "costing-db": "costing-service",
  "dispatch-db": "dispatch-service",
  "employees-db": "employees-service",
  "financial-reconciliation-db": "financial-service",
  "finishing-db": "finishing-service",
  "inventory-db": "inventory-service",
  "invoices-db": "invoices-service",
  "materials-db": "materials-service",
  "orders-db": "orders-service",
  "packing-db": "packing-service",
  "payroll-db": "payroll-service",
  "production-db": "production-service",
  "products-db": "products-service",
  "purchases-db": "purchases-service",
  "qa-db": "qa-service",
  "quotations-db": "quotations-service",
  "reports-db": "reports-service",
  "settings-db": "settings-service",
  "tracking-db": "tracking-service",
};

const directoriesToUpdate = ["app", "components", "lib/mysql", "lib/api"];

function processDirectory(dirPath) {
  if (!fs.existsSync(dirPath)) return;
  const entries = fs.readdirSync(dirPath, { withFileTypes: true });

  for (const entry of entries) {
    const fullPath = path.join(dirPath, entry.name);
    if (entry.isDirectory()) {
      if (entry.name !== "node_modules" && entry.name !== ".next") {
        processDirectory(fullPath);
      }
    } else if (entry.isFile() && (entry.name.endsWith(".ts") || entry.name.endsWith(".tsx"))) {
      let content = fs.readFileSync(fullPath, "utf-8");
      let modified = false;

      for (const [sBase, dBase] of Object.entries(fileMapping)) {
        const regexStr = `@/lib/services/${sBase}`;
        if (content.includes(regexStr)) {
          content = content.replaceAll(regexStr, `@/lib/services/${dBase}`);
          modified = true;
        }
      }

      if (modified) {
        fs.writeFileSync(fullPath, content, "utf-8");
        console.log(`Updated imports in: ${path.relative(rootDir, fullPath)}`);
      }
    }
  }
}

for (const dir of directoriesToUpdate) {
  processDirectory(path.join(rootDir, dir));
}

console.log("Finished updating imports across app, components, lib/mysql, lib/api!");
