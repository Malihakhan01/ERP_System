import mysql from "mysql2/promise";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function main() {
  console.log("Connecting to MySQL at 127.0.0.1:3306 for database 'factoryos'...");

  try {
    const connection = await mysql.createConnection({
      host: "127.0.0.1",
      port: 3306,
      user: "root",
      password: "",
      database: "factoryos",
      multipleStatements: true,
    });

    console.log("✅ Successfully connected to MySQL database 'factoryos'!");

    // Check existing tables
    const [tables] = await connection.query("SHOW TABLES");
    console.log(`Current tables in 'factoryos': ${tables.length}`);

    if (tables.length === 0) {
      console.log("Database is empty. Importing schema_mysql.sql to create all tables...");
      const schemaPath = path.resolve(__dirname, "../backend/database/schema_mysql.sql");
      const sql = fs.readFileSync(schemaPath, "utf-8");

      await connection.query(sql);
      console.log("✅ All 22 tables successfully created and configured!");

      const [newTables] = await connection.query("SHOW TABLES");
      console.log("Created tables:", newTables.map((t) => Object.values(t)[0]));
    } else {
      console.log("Existing tables:", tables.map((t) => Object.values(t)[0]));
    }

    await connection.end();
  } catch (error) {
    console.error("❌ MySQL Connection Failed:", error.message);
  }
}

main();
