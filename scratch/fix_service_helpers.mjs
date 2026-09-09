import fs from "fs";
import path from "path";

const rootDir = process.cwd();
const servicesDir = path.join(rootDir, "lib", "services");

const serviceFiles = fs.readdirSync(servicesDir).filter((f) => f.endsWith(".ts"));

const stubHeader = `
// Database Mode: Pure MySQL 8 / REST API Architecture (Database SDK Removed)
const isDatabaseConfigured = (): boolean => false;
const createClient = (): any => ({
  from: () => ({
    select: () => ({
      eq: () => ({ maybeSingle: async () => ({ data: null, error: null }), single: async () => ({ data: null, error: null }), order: async () => ({ data: [], error: null }) }),
      neq: () => ({ order: async () => ({ data: [], error: null }) }),
      order: async () => ({ data: [], error: null }),
    }),
    insert: async () => ({ data: null, error: null }),
    upsert: () => ({ select: () => ({ single: async () => ({ data: null, error: null }) }) }),
    update: () => ({ eq: async () => ({ data: null, error: null }) }),
    delete: () => ({ eq: async () => ({ data: null, error: null }) }),
  }),
  storage: {
    from: () => ({
      upload: async () => ({ data: null, error: null }),
      getPublicUrl: () => ({ data: { publicUrl: "" } }),
    }),
  },
});
`;

for (const file of serviceFiles) {
  const filePath = path.join(servicesDir, file);
  let content = fs.readFileSync(filePath, "utf-8");

  if (content.includes("isDatabaseConfigured") || content.includes("createClient")) {
    // Inject stubHeader right after imports
    const firstImportIndex = content.lastIndexOf("import ");
    if (firstImportIndex !== -1) {
      const endOfImports = content.indexOf("\n", content.indexOf(";", firstImportIndex)) + 1;
      content = content.slice(0, endOfImports) + stubHeader + content.slice(endOfImports);
    } else {
      content = stubHeader + content;
    }
    fs.writeFileSync(filePath, content, "utf-8");
    console.log(`Injected pure-SQL stub in: ${file}`);
  }
}

console.log("Done adding pure SQL stubs!");
