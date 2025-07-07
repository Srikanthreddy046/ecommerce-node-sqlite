const express = require('express');
const router = express.Router();
const db = require('../models/db');

// GET /api/products?search=&category=&page=&limit=
router.get('/', (req, res) => {
  let { search = '', category = '', page = 1, limit = 10 } = req.query;
  page = parseInt(page);
  limit = parseInt(limit);
  let params = [];
  let where = [];
  if (search) {
    where.push('name LIKE ?');
    params.push(`%${search}%`);
  }
  if (category) {
    where.push('category = ?');
    params.push(category);
  }
  const whereClause = where.length ? 'WHERE ' + where.join(' AND ') : '';
  db.all(`SELECT COUNT(*) as count FROM products ${whereClause}`, params, (err, countRows) => {
    if (err) return res.status(500).json({ message: 'DB error' });
    db.all(`SELECT * FROM products ${whereClause} LIMIT ? OFFSET ?`, [...params, limit, (page-1)*limit], (err, rows) => {
      if (err) return res.status(500).json({ message: 'DB error' });
      res.json({ total: countRows[0].count, products: rows });
    });
  });
});

// Admin: Add product
router.post('/', require('../middleware/auth').authenticateToken, require('../middleware/auth').authorizeRoles('admin'), (req, res) => {
  const { name, price, category } = req.body;
  if (!name || !price || !category) return res.status(400).json({ message: 'All fields required' });
  db.run('INSERT INTO products (name, price, category) VALUES (?, ?, ?)', [name, price, category], function(err) {
    if (err) return res.status(500).json({ message: 'DB error' });
    res.status(201).json({ message: 'Product added', id: this.lastID });
  });
});

// Admin: Update product
router.put('/:id', require('../middleware/auth').authenticateToken, require('../middleware/auth').authorizeRoles('admin'), (req, res) => {
  const { name, price, category } = req.body;
  db.run('UPDATE products SET name = ?, price = ?, category = ? WHERE id = ?', [name, price, category, req.params.id], function(err) {
    if (err) return res.status(500).json({ message: 'DB error' });
    if (this.changes === 0) return res.status(404).json({ message: 'Not found' });
    res.json({ message: 'Product updated' });
  });
});

// Admin: Delete product
router.delete('/:id', require('../middleware/auth').authenticateToken, require('../middleware/auth').authorizeRoles('admin'), (req, res) => {
  db.run('DELETE FROM products WHERE id = ?', [req.params.id], function(err) {
    if (err) return res.status(500).json({ message: 'DB error' });
    if (this.changes === 0) return res.status(404).json({ message: 'Not found' });
    res.json({ message: 'Product deleted' });
  });
});

module.exports = router;
