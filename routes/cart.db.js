const express = require('express');
const router = express.Router();
const db = require('../models/db');
const { authenticateToken, authorizeRoles } = require('../middleware/auth');

// Helper: get user id by username
function getUserId(username, cb) {
  db.get('SELECT id FROM users WHERE username = ?', [username], (err, row) => {
    if (err || !row) return cb(null);
    cb(row.id);
  });
}

// Get current user's cart
// Get current user's cart with product details (including price)
router.get('/', authenticateToken, authorizeRoles('customer'), (req, res) => {
  getUserId(req.user.username, userId => {
    if (!userId) return res.status(404).json({ message: 'User not found' });
    db.get('SELECT id FROM carts WHERE user_id = ?', [userId], (err, cart) => {
      if (!cart) return res.json({ items: [] });
      db.all(`
        SELECT cart_items.product_id, cart_items.quantity, products.name, products.price, products.category
        FROM cart_items
        JOIN products ON cart_items.product_id = products.id
        WHERE cart_items.cart_id = ?
      `, [cart.id], (err, items) => {
        res.json({ items: items || [] });
      });
    });
  });
});

// Add item to cart
router.post('/add', authenticateToken, authorizeRoles('customer'), (req, res) => {
  const { productId, quantity } = req.body;
  if (!productId || !quantity) return res.status(400).json({ message: 'All fields required' });
  getUserId(req.user.username, userId => {
    if (!userId) return res.status(404).json({ message: 'User not found' });
    db.get('SELECT * FROM products WHERE id = ?', [productId], (err, product) => {
      if (!product) return res.status(404).json({ message: 'Product not found' });
      db.get('SELECT id FROM carts WHERE user_id = ?', [userId], (err, cart) => {
        function addItem(cartId) {
          db.get('SELECT * FROM cart_items WHERE cart_id = ? AND product_id = ?', [cartId, productId], (err, item) => {
            if (item) {
              db.run('UPDATE cart_items SET quantity = quantity + ? WHERE id = ?', [quantity, item.id], () => {
                res.json({ message: 'Item added to cart' });
              });
            } else {
              db.run('INSERT INTO cart_items (cart_id, product_id, quantity) VALUES (?, ?, ?)', [cartId, productId, quantity], () => {
                res.json({ message: 'Item added to cart' });
              });
            }
          });
        }
        if (!cart) {
          db.run('INSERT INTO carts (user_id) VALUES (?)', [userId], function() {
            addItem(this.lastID);
          });
        } else {
          addItem(cart.id);
        }
      });
    });
  });
});

// Update item quantity
router.put('/update', authenticateToken, authorizeRoles('customer'), (req, res) => {
  const { productId, quantity } = req.body;
  getUserId(req.user.username, userId => {
    db.get('SELECT id FROM carts WHERE user_id = ?', [userId], (err, cart) => {
      if (!cart) return res.status(404).json({ message: 'Cart not found' });
      if (quantity <= 0) {
        db.run('DELETE FROM cart_items WHERE cart_id = ? AND product_id = ?', [cart.id, productId], function(err) {
          if (err) return res.status(500).json({ message: 'DB error' });
          if (this.changes === 0) return res.status(404).json({ message: 'Item not found' });
          res.json({ message: 'Item removed from cart' });
        });
      } else {
        db.run('UPDATE cart_items SET quantity = ? WHERE cart_id = ? AND product_id = ?', [quantity, cart.id, productId], function() {
          if (this.changes === 0) return res.status(404).json({ message: 'Item not found' });
          res.json({ message: 'Cart updated' });
        });
      }
    });
  });
});

// Remove item
router.delete('/remove/:productId', authenticateToken, authorizeRoles('customer'), (req, res) => {
  getUserId(req.user.username, userId => {
    db.get('SELECT id FROM carts WHERE user_id = ?', [userId], (err, cart) => {
      if (!cart) return res.status(404).json({ message: 'Cart not found' });
      db.run('DELETE FROM cart_items WHERE cart_id = ? AND product_id = ?', [cart.id, req.params.productId], function(err) {
        if (err) return res.status(500).json({ message: 'DB error' });
        res.json({ message: 'Item removed' });
      });
    });
  });
});

// Place order from cart
router.post('/order', authenticateToken, authorizeRoles('customer'), (req, res) => {
  getUserId(req.user.username, userId => {
    db.get('SELECT id FROM carts WHERE user_id = ?', [userId], (err, cart) => {
      if (!cart) return res.status(400).json({ message: 'Cart is empty' });
      db.all('SELECT * FROM cart_items WHERE cart_id = ?', [cart.id], (err, items) => {
        if (!items || items.length === 0) return res.status(400).json({ message: 'Cart is empty' });
        db.run('INSERT INTO orders (user_id, date) VALUES (?, ?)', [userId, new Date().toISOString()], function(err) {
          if (err) return res.status(500).json({ message: 'Order failed' });
          const orderId = this.lastID;
          let completed = 0;
          items.forEach(item => {
            db.run('INSERT INTO order_items (order_id, product_id, quantity) VALUES (?, ?, ?)', [orderId, item.product_id, item.quantity], () => {
              completed++;
              if (completed === items.length) {
                db.run('DELETE FROM cart_items WHERE cart_id = ?', [cart.id], () => {
                  res.status(201).json({ message: 'Order placed' });
                });
              }
            });
          });
        });
      });
    });
  });
});

module.exports = router;
