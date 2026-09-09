import fs from "fs";
import path from "path";

const rootDir = process.cwd();
const servicesDir = path.join(rootDir, "lib", "services");

console.log("1. Cleaning up all files in lib/services/ to remove Database SDK calls...");

const serviceFiles = fs.readdirSync(servicesDir).filter((f) => f.endsWith(".ts"));

for (const file of serviceFiles) {
  const filePath = path.join(servicesDir, file);
  if (file === "client.ts") {
    fs.unlinkSync(filePath);
    console.log("Deleted lib/services/client.ts");
    continue;
  }

  let content = fs.readFileSync(filePath, "utf-8");

  // Remove import { createClient } from "./client";
  content = content.replace(/import\s*\{\s*createClient\s*\}\s*from\s*["']\.\/client["'];?\n?/g, "");
  // Remove import { isDatabaseConfigured } ...
  content = content.replace(/import\s*\{\s*isDatabaseConfigured\s*\}\s*from\s*["'][^"']+["'];?\n?/g, "");
  // Remove export function isDatabaseConfigured(): boolean { ... }
  content = content.replace(/export\s+function\s+isDatabaseConfigured\(\):\s*boolean\s*\{[\s\S]*?return\s+(true|false);\s*\}\n?/g, "");

  // Replace Database comments with MySQL / FactoryOS Service
  content = content.replace(/Database Database Service Layer/g, "MySQL Database Service Layer");
  content = content.replace(/Database Database & Storage Service Layer/g, "MySQL Database & Storage Service Layer");
  content = content.replace(/Primary source of truth: PostgreSQL/g, "Primary source of truth: MySQL 8");

  fs.writeFileSync(filePath, content, "utf-8");
  console.log(`Cleaned: lib/services/${file}`);
}

// 2. Remove lib/services/ folder completely
const dbLibDir = path.join(rootDir, "lib", "database");
if (fs.existsSync(dbLibDir)) {
  fs.rmSync(dbLibDir, { recursive: true, force: true });
  console.log("2. Deleted lib/services/ folder completely.");
}

// 3. Move/Copy backend/database/schema_mysql.sql to database/schema.sql and remove database/ folder
const databaseDir = path.join(rootDir, "database");
if (!fs.existsSync(databaseDir)) {
  fs.mkdirSync(databaseDir, { recursive: true });
}

const mysqlSchemaSrc = path.join(rootDir, "backend", "database", "schema_mysql.sql");
const sqlDest = path.join(databaseDir, "schema.sql");
if (fs.existsSync(mysqlSchemaSrc)) {
  fs.copyFileSync(mysqlSchemaSrc, sqlDest);
  console.log("3. Created database/schema.sql from pure MySQL 8 schema.");
}

const dbDir = path.join(rootDir, "database");
if (fs.existsSync(dbDir)) {
  fs.rmSync(dbDir, { recursive: true, force: true });
  console.log("4. Deleted legacy database/ folder.");
}

// 4. Update package.json to remove @database packages
const packageJsonPath = path.join(rootDir, "package.json");
if (fs.existsSync(packageJsonPath)) {
  const pkg = JSON.parse(fs.readFileSync(packageJsonPath, "utf-8"));
  if (pkg.dependencies) {
    delete pkg.dependencies["@database/ssr"];
    delete pkg.dependencies["@database/database-js"];
  }
  fs.writeFileSync(packageJsonPath, JSON.stringify(pkg, null, 2) + "\n", "utf-8");
  console.log("5. Removed @database dependencies from package.json.");
}

// 5. Clean up .env.example
const envExamplePath = path.join(rootDir, ".env.example");
if (fs.existsSync(envExamplePath)) {
  let envContent = fs.readFileSync(envExamplePath, "utf-8");
  envContent = envContent.replace(/NEXT_PUBLIC_DB_URL=.*\n?/g, "");
  envContent = envContent.replace(/NEXT_PUBLIC_DB_ANON_KEY=.*\n?/g, "");
  envContent = envContent.replace(/DB_SERVICE_ROLE_KEY=.*\n?/g, "");
  fs.writeFileSync(envExamplePath, envContent, "utf-8");
  console.log("6. Cleaned up .env.example.");
}

console.log("Database completely purged!");
