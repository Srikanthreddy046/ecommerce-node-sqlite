const express = require('express');
const router = express.Router();
const products = require('../models/product');
const { authenticateToken, authorizeRoles } = require('../middleware/auth');

// GET /api/products?search=&category=&page=&limit=
router.get('/', (req, res) => {
  let { search, category, page = 1, limit = 10 } = req.query;
  let filtered = products;
  if (search) filtered = filtered.filter(p => p.name.toLowerCase().includes(search.toLowerCase()));
  if (category) filtered = filtered.filter(p => p.category === category);
  const start = (page - 1) * limit;
  const end = start + parseInt(limit);
  res.json({
    total: filtered.length,
    products: filtered.slice(start, end)
  });
});

// Admin: Add product
router.post('/', authenticateToken, authorizeRoles('admin'), (req, res) => {
  const { name, price, category } = req.body;
  if (!name || !price || !category) return res.status(400).json({ message: 'All fields required' });
  const id = products.length + 1;
  products.push({ id, name, price, category });
  res.status(201).json({ message: 'Product added' });
});

// Admin: Update product
router.put('/:id', authenticateToken, authorizeRoles('admin'), (req, res) => {
  const product = products.find(p => p.id == req.params.id);
  if (!product) return res.status(404).json({ message: 'Not found' });
  Object.assign(product, req.body);
  res.json({ message: 'Product updated' });
});

// Admin: Delete product
router.delete('/:id', authenticateToken, authorizeRoles('admin'), (req, res) => {
  const idx = products.findIndex(p => p.id == req.params.id);
  if (idx === -1) return res.status(404).json({ message: 'Not found' });
  products.splice(idx, 1);
  res.json({ message: 'Product deleted' });
});

module.exports = router;
