// eslint-disable-next-line import/no-extraneous-dependencies
const mongoose = require('mongoose');

const dotenv = require('dotenv');

dotenv.config({ path: './config.env', override: true });

const DB = process.env.DATABASE.replace(
  '<PASSWORD>',
  process.env.DATABASE_PASSWORD,
);

mongoose
  .connect(DB)
  .then(() => {
    console.log('✅ DB connection successful!');
  })
  .catch((err) => {
    console.error('❌ DB connection error:', err);
  });

const app = require('./app');

//////////////// Start Server ////////////////
const port = process.env.PORT || 8000;
app.listen(port, () => {
  console.log(`🚀 App running on port ${port}...`);
});
