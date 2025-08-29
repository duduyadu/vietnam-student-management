const express = require('express');
const cors = require('cors');
const app = express();

app.use(cors());
app.use(express.json());

// Test route
app.get('/api/agencies/test', (req, res) => {
  res.json({ message: 'Test route works!' });
});

// Agencies routes
const agenciesRoutes = require('./routes/agencies');
app.use('/api/agencies', agenciesRoutes);

app.listen(5001, () => {
  console.log('Test server running on port 5001');
});