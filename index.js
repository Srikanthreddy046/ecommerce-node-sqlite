require('dotenv').config();
const express = require('express');
const cors = require('cors');
const app = express();

// Middleware
app.use(cors());
app.use(express.json());

// Database
const db = require('./models/db');

// Routes (update to use DB in auth, products, cart, and orders routes)
app.use('/api/auth', require('./routes/auth.db'));
app.use('/api/products', require('./routes/products.db'));
app.use('/api/cart', require('./routes/cart.db'));
app.use('/api/orders', require('./routes/orders.db'));

// Root
app.get('/', (req, res) => {
  res.sendFile(__dirname + '/index.html');
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
