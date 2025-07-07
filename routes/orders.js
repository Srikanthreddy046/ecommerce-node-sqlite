const express = require('express');
const router = express.Router();
const orders = require('../models/order');
const carts = require('../models/cart');
const products = require('../models/product');
const { authenticateToken, authorizeRoles } = require('../middleware/auth');

// Create order from cart
router.post('/', authenticateToken, authorizeRoles('customer'), (req, res) => {
  const cart = carts.find(c => c.username === req.user.username);
  if (!cart || cart.items.length === 0) return res.status(400).json({ message: 'Cart is empty' });
  const orderItems = cart.items.map(i => {
    const product = products.find(p => p.id == i.productId);
    return { productId: i.productId, name: product ? product.name : '', quantity: i.quantity };
  });
  const order = {
    id: orders.length + 1,
    username: req.user.username,
    items: orderItems,
    date: new Date()
  };
  orders.push(order);
  cart.items = [];
  res.status(201).json({ message: 'Order placed', order });
});

// Get user's orders
router.get('/', authenticateToken, authorizeRoles('customer'), (req, res) => {
  const userOrders = orders.filter(o => o.username === req.user.username);
  res.json(userOrders);
});

module.exports = router;
