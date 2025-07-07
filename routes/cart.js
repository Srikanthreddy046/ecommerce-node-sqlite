const express = require('express');
const router = express.Router();
const carts = require('../models/cart');
const products = require('../models/product');
const { authenticateToken, authorizeRoles } = require('../middleware/auth');

// Get current user's cart
router.get('/', authenticateToken, authorizeRoles('customer'), (req, res) => {
  let cart = carts.find(c => c.username === req.user.username);
  if (!cart) cart = { username: req.user.username, items: [] };
  res.json(cart);
});

// Add item to cart
router.post('/add', authenticateToken, authorizeRoles('customer'), (req, res) => {
  const { productId, quantity } = req.body;
  if (!productId || !quantity) return res.status(400).json({ message: 'All fields required' });
  const product = products.find(p => p.id == productId);
  if (!product) return res.status(404).json({ message: 'Product not found' });
  let cart = carts.find(c => c.username === req.user.username);
  if (!cart) {
    cart = { username: req.user.username, items: [] };
    carts.push(cart);
  }
  const item = cart.items.find(i => i.productId == productId);
  if (item) item.quantity += quantity;
  else cart.items.push({ productId, quantity });
  res.json({ message: 'Item added to cart' });
});

// Update item quantity
router.put('/update', authenticateToken, authorizeRoles('customer'), (req, res) => {
  const { productId, quantity } = req.body;
  let cart = carts.find(c => c.username === req.user.username);
  if (!cart) return res.status(404).json({ message: 'Cart not found' });
  const item = cart.items.find(i => i.productId == productId);
  if (!item) return res.status(404).json({ message: 'Item not found' });
  item.quantity = quantity;
  res.json({ message: 'Cart updated' });
});

// Remove item
router.delete('/remove/:productId', authenticateToken, authorizeRoles('customer'), (req, res) => {
  let cart = carts.find(c => c.username === req.user.username);
  if (!cart) return res.status(404).json({ message: 'Cart not found' });
  cart.items = cart.items.filter(i => i.productId != req.params.productId);
  res.json({ message: 'Item removed' });
});

module.exports = router;
