import mysql from 'mysql2/promise';
import fs from 'fs';

async function verifyAndSync() {
  const connection = await mysql.createConnection({
    host: '127.0.0.1',
    port: 3306,
    user: 'root',
    password: '',
    database: 'factoryos',
    multipleStatements: true,
  });

  console.log('Connected to MySQL factoryos database.');

  // Read database/schema.sql
  const schemaSql = fs.readFileSync('database/schema.sql', 'utf8');

  // Check which tables are created
  const [existingTables] = await connection.query('SHOW TABLES');
  const tableNames = existingTables.map((r) => Object.values(r)[0]);
  console.log(`Current existing tables (${tableNames.length}):`, tableNames);

  // Execute schema to ensure all tables, constraints, and seeds are fully synced
  console.log('Running full schema sync from database/schema.sql...');
  await connection.query(schemaSql);

  const [afterTables] = await connection.query('SHOW TABLES');
  const afterTableNames = afterTables.map((r) => Object.values(r)[0]);
  console.log(`Updated tables in factoryos (${afterTableNames.length}):`, afterTableNames);

  // Check sample counts
  const tablesToCheck = ['users', 'clients', 'products', 'orders', 'system_settings', 'audit_logs', 'employees', 'employee_advances', 'payroll_runs', 'inventory_items'];
  for (const t of tablesToCheck) {
    if (afterTableNames.includes(t)) {
      const [count] = await connection.query(`SELECT COUNT(*) as cnt FROM \`${t}\``);
      console.log(`Table [${t}]: ${count[0].cnt} records`);
    } else {
      console.log(`Table [${t}]: NOT FOUND`);
    }
  }

  await connection.end();
  console.log('Database sync successfully completed!');
}

verifyAndSync().catch((err) => {
  console.error('Sync error:', err);
  process.exit(1);
});
