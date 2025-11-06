///////////////// app.js ////////////////
// The main app file where the Express app, middlewares, and routes are defined.

const express = require('express');
const morgan = require('morgan');
const tourRouter = require('./routes/tourRoutes');
const userRouter = require('./routes/userRoutes');

const app = express();

//////////////// Middleware ////////////////
// Middleware is a function that can modify incomming request data.
// This middleware will be called for every request that comes into the server, because their logic precedes the route handlers.
// 'next' is a naming convention for calling the next middleware in line.
if (process.env.NODE_ENV === 'development') {
  app.use(morgan('dev'));
}

app.use(express.json());

// Serving static files
app.use(express.static(`${__dirname}/public`));

app.use((req, res, next) => {
  console.log('Hello from the middleware 👋');
  next();
});

app.use((req, res, next) => {
  // add current time to the request object
  req.requestTime = new Date().toISOString();
  next();
});

//////////////// Routes ////////////////
app.use('/api/v1/tours', tourRouter);
app.use('/api/v1/users', userRouter);

module.exports = app;
