import mysql from 'mysql2/promise';

async function migrateEmployeeTasks() {
  const connection = await mysql.createConnection({
    host: '127.0.0.1',
    port: 3306,
    user: 'root',
    password: '',
    database: 'factoryos',
    multipleStatements: true,
  });

  console.log('Connected to MySQL factoryos database.');

  // Create employee_tasks table
  await connection.query(`
    CREATE TABLE IF NOT EXISTS \`employee_tasks\` (
      \`id\` BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
      \`uuid\` CHAR(36) NOT NULL UNIQUE,
      \`task_number\` VARCHAR(50) NOT NULL UNIQUE,
      \`title\` VARCHAR(255) NOT NULL,
      \`description\` TEXT NULL,
      \`task_type\` VARCHAR(50) NOT NULL DEFAULT 'general',
      \`priority\` VARCHAR(20) NOT NULL DEFAULT 'normal',
      \`status\` VARCHAR(30) NOT NULL DEFAULT 'assigned',
      \`assigned_to_employee_id\` BIGINT UNSIGNED NOT NULL,
      \`assigned_to_name\` VARCHAR(150) NOT NULL,
      \`assigned_by_user_id\` BIGINT UNSIGNED NULL,
      \`assigned_by_name\` VARCHAR(150) NOT NULL DEFAULT 'Factory Admin',
      \`order_id\` BIGINT UNSIGNED NULL,
      \`production_job_id\` BIGINT UNSIGNED NULL,
      \`due_date\` DATE NOT NULL,
      \`due_time\` VARCHAR(20) NULL,
      \`completed_at\` TIMESTAMP NULL,
      \`completion_notes\` TEXT NULL,
      \`created_at\` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      \`updated_at\` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      INDEX \`idx_task_employee\` (\`assigned_to_employee_id\`),
      INDEX \`idx_task_status\` (\`status\`),
      INDEX \`idx_task_priority\` (\`priority\`),
      FOREIGN KEY (\`assigned_to_employee_id\`) REFERENCES \`employees\` (\`id\`) ON DELETE CASCADE
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
  `);

  console.log('Created or verified table: employee_tasks');

  // Seed sample tasks if table is empty
  const [existing] = await connection.query('SELECT COUNT(*) as cnt FROM `employee_tasks`');
  if (existing[0].cnt === 0) {
    const [empRows] = await connection.query('SELECT id, full_name FROM `employees` LIMIT 4');
    if (empRows.length > 0) {
      const emp1 = empRows[0];
      const emp2 = empRows[1] || empRows[0];

      await connection.query(`
        INSERT INTO \`employee_tasks\`
        (\`uuid\`, \`task_number\`, \`title\`, \`description\`, \`task_type\`, \`priority\`, \`status\`, \`assigned_to_employee_id\`, \`assigned_to_name\`, \`assigned_by_name\`, \`due_date\`, \`due_time\`)
        VALUES
        (UUID(), 'TSK-2026-001', 'Flatlock Seam Calibration for HD-380', 'Inspect and calibrate differential feed on 4-thread flatlock machines prior to bulk run.', 'machine_setup', 'high', 'assigned', ?, ?, 'Factory Admin', CURDATE(), '16:00'),
        (UUID(), 'TSK-2026-002', 'Spreading & Lay Verification for Lot 081', 'Confirm ply tension and end allowance on fabric spreading table 1 for heavy fleece.', 'cutting', 'urgent', 'in_progress', ?, ?, 'Tariq Mahmood (Supervisor)', DATE_ADD(CURDATE(), INTERVAL 1 DAY), '14:00');
      `, [emp1.id, emp1.full_name, emp2.id, emp2.full_name]);

      console.log('Seeded 2 initial employee tasks');
    }
  }

  await connection.end();
  console.log('employee_tasks migration complete!');
}

migrateEmployeeTasks().catch((err) => {
  console.error('Migration error:', err);
  process.exit(1);
});
