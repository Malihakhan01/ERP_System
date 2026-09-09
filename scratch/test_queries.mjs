import mysql from 'mysql2/promise';

async function test() {
  const conn = await mysql.createConnection({
    host: '127.0.0.1',
    port: 3306,
    user: 'root',
    password: '',
    database: 'factoryos'
  });

  const queries = [
    ['orders', 'SELECT COUNT(*) as active_orders, SUM(total_value) as total_order_value, SUM(quantity) as total_units FROM orders WHERE is_archived = 0 AND status != " cancelled\'],
 ['jobs', 'SELECT COUNT(*) as active_jobs, SUM(planned_quantity) as total_planned_qty FROM production_jobs WHERE is_archived = 0 AND status != \completed\'],
 ['cutting', 'SELECT COUNT(*) as cnt FROM cutting_plans WHERE status != \completed\ AND status != \cancelled\'],
 ['stitching', 'SELECT COUNT(*) as cnt FROM production_bundles WHERE status != \completed\'],
 ['finishing', 'SELECT COUNT(*) as cnt FROM finishing_operations WHERE status != \completed\'],
 ['qa', 'SELECT COUNT(*) as cnt FROM qa_inspections WHERE inspection_result = \Pending\ OR status = \pending\'],
 ['packing', 'SELECT COUNT(*) as cnt FROM packing_cartons WHERE status = \open\ OR status = \in_progress\'],
 ['stagedCartons', 'SELECT COUNT(*) as cnt FROM packing_cartons WHERE status = \sealed\ OR status = \loaded\'],
 ['fabric', 'SELECT SUM(available_stock) as fabric_kg, SUM(allocated_stock) as allocated_kg, SUM(total_stock * unit_cost) as total_valuation FROM inventory_items WHERE is_archived = 0 AND category = \fabric\'],
 ['lowStock', 'SELECT COUNT(*) as cnt FROM inventory_items WHERE is_archived = 0 AND (available_stock <= min_reorder_level OR available_stock <= 0)'],
 ['bayRows', 'SELECT bay, SUM(available_stock) as total_avail FROM inventory_items WHERE is_archived = 0 GROUP BY bay'],
 ['purchases', 'SELECT SUM(balance) as total_payable, SUM(total_amount) as total_po_val FROM purchases WHERE is_archived = 0'],
 ['invoices', 'SELECT SUM(grand_total) as total_invoiced, SUM(paid_amount) as total_collected, SUM(balance_due) as total_receivable FROM invoices WHERE is_archived = 0'],
 ['costing', 'SELECT AVG(net_margin_pct) as avg_margin FROM cost_estimates WHERE is_archived = 0'],
 ['employees', 'SELECT COUNT(*) as active_workers FROM employees WHERE is_archived = 0 AND status = \Active\']
 ];

 for (const [name, q] of queries) {
 try {
 const [rows] = await conn.execute(q);
 console.log('SUCCESS:', name, rows[0]);
 } catch (e) {
 console.error('FAILED:', name, e.message);
 }
 }

 await conn.end();
}

test();
