const express = require('express');
const router = express.Router();
const db = require('../models/db');
const { authenticateToken, authorizeRoles } = require('../middleware/auth');

function getUserId(username, cb) {
  db.get('SELECT id FROM users WHERE username = ?', [username], (err, row) => {
    if (err || !row) return cb(null);
    cb(row.id);
  });
}

// Get user's orders
router.get('/', authenticateToken, authorizeRoles('customer'), (req, res) => {
  getUserId(req.user.username, userId => {
    if (!userId) return res.json([]);
    db.all('SELECT * FROM orders WHERE user_id = ? ORDER BY date DESC', [userId], (err, orders) => {
      if (!orders || orders.length === 0) return res.json([]);
      let completed = 0;
      orders.forEach(order => {
        db.all('SELECT oi.quantity, p.name FROM order_items oi JOIN products p ON oi.product_id = p.id WHERE oi.order_id = ?', [order.id], (err, items) => {
          order.items = items || [];
          completed++;
          if (completed === orders.length) {
            res.json(orders);
          }
        });
      });
    });
  });
});

module.exports = router;
