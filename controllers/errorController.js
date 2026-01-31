// Compatible with Mongoose v6 and v7 and MongoDB Node driver 4

const AppError = require('../utils/appError');

/**
 * Handle Mongoose "CastError":
 * Occurs when MongoDB receives an invalid ID or invalid value for a field.
 * Example: /api/v1/users/123abc (invalid ObjectId)
 */
const handleCastErrorDB = (err) => {
  const message = `Invalid ${err.path}: ${err.value}.`;
  return new AppError(message, 400);
};

/**
 * Handle MongoDB duplicate key errors:
 * Occurs when a unique field (email, username, etc.) already exists.
 * err.keyValue contains the conflicting field + value.
 */
const handleDuplicateFieldsDB = (err) => {
  const field = Object.keys(err.keyValue)[0];
  const value = err.keyValue[field];
  const message = `Duplicate value '${value}' for field '${field}'. Please use another value!`;
  return new AppError(message, 400);
};

/**
 * Handle Mongoose validation errors:
 * Example: required fields missing, invalid email format, etc.
 * Aggregates all validation error messages into one.
 */
const handleValidationErrorDB = (err) => {
  const errors = Object.values(err.errors).map((el) => el.message);
  const message = `Invalid input data. ${errors.join('. ')}`;
  return new AppError(message, 400);
};

const handleJWTError = () =>
  new AppError('Invalid token. Please log in again!', 401);
const handleJWTExpiredError = () =>
  new AppError('Your token has expired! Please log in again.', 401);

/*
Two functions that send errors back to client
one for development one for production
Both functions distinguish between
- Operational (trusted) errors that get sent to the client (err.message)
- Unknown or programming errors send a generic message without the detail
*/

const sendErrorDev = (err, req, res) => {
  // A) API
  if (req.originalUrl.startsWith('/api')) {
    return res.status(err.statusCode).json({
      status: err.status,
      error: err,
      message: err.message,
      stack: err.stack,
    });
  }

  // B) RENDERED WEBSITE
  console.error('ERROR 💥', err);
  return res.status(err.statusCode).render('error', {
    title: 'Something went wrong!',
    msg: err.message,
  });
};

const sendErrorProd = (err, req, res) => {
  // A) API
  if (req.originalUrl.startsWith('/api')) {
    // A) Operational, trusted error: send message to client
    if (err.isOperational) {
      return res.status(err.statusCode).json({
        status: err.status,
        message: err.message,
      });
    }
    // B) Programming or other unknown error: don't leak error details
    // 1) Log error
    console.error('ERROR 💥', err);
    // 2) Send generic message
    return res.status(500).json({
      status: 'error',
      message: 'Something went very wrong!',
    });
  }

  // B) RENDERED WEBSITE
  // A) Operational, trusted error: send message to client
  if (err.isOperational) {
    console.log(err);
    return res.status(err.statusCode).render('error', {
      title: 'Something went wrong!',
      msg: err.message,
    });
  }
  // B) Programming or other unknown error: don't leak error details
  // 1) Log error
  console.error('ERROR 💥', err);
  // 2) Send generic message
  return res.status(err.statusCode).render('error', {
    title: 'Something went wrong!',
    msg: 'Please try again later.',
  });
};

/**
 * Global error-handling middleware:
 * All errors in the app flow through this middleware.
 */
module.exports = (err, req, res, next) => {
  // Set default values for uninitialized errors
  err.statusCode = err.statusCode || 500;
  err.status = err.status || 'error';

  /**
   * DEVELOPMENT MODE
   * - Send full error details for debugging
   */
  if (process.env.NODE_ENV === 'development') {
    return sendErrorDev(err, req, res);
  }

  /**
   * PRODUCTION MODE
   * - Errors must be sanitized
   * - Must copy error manually (spread loses non-enumerable props)
   */
  if (process.env.NODE_ENV === 'production') {
    // Correct way to copy the error object without losing important properties
    let error = Object.create(err);
    error.message = err.message; // Required because message is not enumerable

    // Mongoose/MongoDB specific errors
    if (error.name === 'CastError') error = handleCastErrorDB(error);
    if (error.code === 11000) error = handleDuplicateFieldsDB(error);
    if (error.name === 'ValidationError')
      error = handleValidationErrorDB(error);
    if (error.name === 'JsonWebTokenError') error = handleJWTError();
    if (error.name === 'TokenExpiredError') error = handleJWTExpiredError();

    return sendErrorProd(error, req, res);
  }
};
