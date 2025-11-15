const mongoose = require('mongoose');
const dotenv = require('dotenv');

//////////////// GLOBAL UNCAUGHT EXCEPTIONS ////////////////
// These happen when code throws synchronously (e.g., undefined variable)
process.on('uncaughtException', (err) => {
  console.error('💥 UNCAUGHT EXCEPTION! Shutting down...');
  console.error(err.name, err.message);
  process.exit(1);
});

// Load environment variables BEFORE requiring app
dotenv.config({ path: './config.env' });

const app = require('./app');

// Build DB connection string
const DB = process.env.DATABASE.replace(
  '<PASSWORD>',
  process.env.DATABASE_PASSWORD,
);

//////////////// DATABASE CONNECTION ////////////////////////

mongoose
  .connect(DB)
  .then(() => {
    console.log('✅ DB connection successful!');
  })
  .catch((err) => {
    console.error('❌ DB connection error:', err);

    // Crash app if DB connection fails at startup
    // because the app can't run without DB
    process.exit(1);
  });

//////////////// START SERVER ///////////////////////////////

const port = process.env.PORT || 8000;
const server = app.listen(port, () => {
  console.log(`🚀 App running on port ${port}...`);
});

// Handle server startup errors (e.g., port already in use)
server.on('error', (err) => {
  console.error('💥 SERVER ERROR during startup:', err);
  process.exit(1);
});

//////////////// UNHANDLED PROMISE REJECTIONS ///////////////
// These happen when a rejected promise has no .catch()
process.on('unhandledRejection', (err) => {
  console.error('💥 UNHANDLED REJECTION! Shutting down...');
  console.error(err.name, err.message);

  // Close server gracefully before exiting
  server.close(() => {
    process.exit(1);
  });
});
