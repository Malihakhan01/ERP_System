/**
 * FactoryOS Garment ERP — MySQL 8 Database Connection & Query Engine
 * Fully replaces Database with MySQL 8 (InnoDB, utf8mb4_unicode_ci).
 */

import mysql from "mysql2/promise";

// MySQL Connection Configuration
const DB_CONFIG: mysql.PoolOptions = {
  host: process.env.MYSQL_HOST || process.env.DB_HOST || "127.0.0.1",
  port: parseInt(process.env.MYSQL_PORT || process.env.DB_PORT || "3306", 10),
  user: process.env.MYSQL_USER || process.env.DB_USERNAME || process.env.DB_USER || "root",
  password: process.env.MYSQL_PASSWORD || process.env.DB_PASSWORD || "",
  database: process.env.MYSQL_DATABASE || process.env.DB_DATABASE || process.env.DB_NAME || "factoryos",
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
  enableKeepAlive: true,
  keepAliveInitialDelay: 0,
  dateStrings: true,
};

let pool: mysql.Pool | null = null;

export function getMySQLPool(): mysql.Pool {
  if (!pool) {
    pool = mysql.createPool(DB_CONFIG);
  }
  return pool;
}

/**
 * Execute a parameterized SQL query against MySQL
 */
export async function executeQuery<T = any>(
  sql: string,
  params: any[] = []
): Promise<T[]> {
  try {
    const db = getMySQLPool();
    const [rows] = await db.query(sql, params);
    return rows as T[];
  } catch (error: any) {
    console.error(`[MySQL Query Error] SQL: ${sql}`, error);
    throw error;
  }
}

/**
 * Execute an INSERT, UPDATE, or DELETE statement
 */
export async function executeStatement(
  sql: string,
  params: any[] = []
): Promise<mysql.ResultSetHeader> {
  try {
    const db = getMySQLPool();
    const [result] = await db.execute(sql, params);
    return result as mysql.ResultSetHeader;
  } catch (error: any) {
    console.error(`[MySQL Statement Error] SQL: ${sql}`, error);
    throw error;
  }
}

/**
 * Execute a series of operations in a single ACID Transaction
 */
export async function executeTransaction<T>(
  callback: (connection: mysql.PoolConnection) => Promise<T>
): Promise<T> {
  const db = getMySQLPool();
  const connection = await db.getConnection();
  try {
    await connection.beginTransaction();
    const result = await callback(connection);
    await connection.commit();
    return result;
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
}

/**
 * Generic MySQL CRUD Helper Methods
 */
export const MySQL = {
  // 1. SELECT multiple rows
  async select<T = any>(table: string, conditions: Record<string, any> = {}, orderBy = "created_at DESC"): Promise<T[]> {
    const keys = Object.keys(conditions);
    let sql = `SELECT * FROM \`${table}\``;
    const params: any[] = [];

    if (keys.length > 0) {
      const whereClauses = keys.map((k) => `\`${k}\` = ?`).join(" AND ");
      sql += ` WHERE ${whereClauses}`;
      keys.forEach((k) => params.push(conditions[k]));
    }

    if (orderBy) {
      sql += ` ORDER BY ${orderBy}`;
    }

    return executeQuery<T>(sql, params);
  },

  // 2. SELECT single row by primary key or column
  async find<T = any>(table: string, idOrConditions: string | number | Record<string, any>): Promise<T | null> {
    if (typeof idOrConditions === "string" || typeof idOrConditions === "number") {
      const rows = await executeQuery<T>(`SELECT * FROM \`${table}\` WHERE \`id\` = ? OR \`uuid\` = ? LIMIT 1`, [idOrConditions, idOrConditions]);
      return rows[0] || null;
    }

    const keys = Object.keys(idOrConditions);
    const whereClauses = keys.map((k) => `\`${k}\` = ?`).join(" AND ");
    const params = keys.map((k) => idOrConditions[k]);
    const rows = await executeQuery<T>(`SELECT * FROM \`${table}\` WHERE ${whereClauses} LIMIT 1`, params);
    return rows[0] || null;
  },

  // 3. INSERT single row
  async insert(table: string, data: Record<string, any>): Promise<number> {
    const keys = Object.keys(data);
    const columns = keys.map((k) => `\`${k}\``).join(", ");
    const placeholders = keys.map(() => "?").join(", ");
    const params = keys.map((k) => {
      const val = data[k];
      if (val === undefined) return null;
      if (typeof val === "object" && val !== null) {
        return JSON.stringify(val);
      }
      return val;
    });

    const sql = `INSERT INTO \`${table}\` (${columns}) VALUES (${placeholders})`;
    const result = await executeStatement(sql, params);
    return result.insertId;
  },

  // 4. UPDATE row(s)
  async update(table: string, id: string | number, data: Record<string, any>): Promise<boolean> {
    const keys = Object.keys(data);
    if (keys.length === 0) return false;

    const setClauses = keys.map((k) => `\`${k}\` = ?`).join(", ");
    const params = keys.map((k) => {
      const val = data[k];
      if (val === undefined) return null;
      if (typeof val === "object" && val !== null) {
        return JSON.stringify(val);
      }
      return val;
    });
    params.push(id, id);

    const sql = `UPDATE \`${table}\` SET ${setClauses} WHERE \`id\` = ? OR \`uuid\` = ?`;
    const result = await executeStatement(sql, params);
    return result.affectedRows > 0;
  },

  // 5. DELETE / Archive row
  async delete(table: string, id: string | number, softDelete = true): Promise<boolean> {
    if (softDelete) {
      const sql = `UPDATE \`${table}\` SET \`is_archived\` = 1 WHERE \`id\` = ? OR \`uuid\` = ?`;
      const result = await executeStatement(sql, [id, id]);
      return result.affectedRows > 0;
    }
    const sql = `DELETE FROM \`${table}\` WHERE \`id\` = ? OR \`uuid\` = ?`;
    const result = await executeStatement(sql, [id, id]);
    return result.affectedRows > 0;
  },
};
