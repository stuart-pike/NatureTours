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

/**
 * Send detailed error in development:
 * Includes full error object + stack trace for debugging.
 */
const sendErrorDev = (err, res) => {
  res.status(err.statusCode).json({
    status: err.status,
    error: err, // Full error object
    message: err.message,
    stack: err.stack, // Stack trace for debugging
  });
};

/**
 * Send filtered error in production:
 * - Only sends operational (trusted) errors to the client
 * - Unknown or programming errors send a generic message
 */
const sendErrorProd = (err, res) => {
  // A trusted operational error → safe to send details
  if (err.isOperational) {
    return res.status(err.statusCode).json({
      status: err.status,
      message: err.message,
    });
  }

  // Programming or unknown error → log it, but hide details from client
  console.error('💥 UNKOWN ERROR 💥', err);

  return res.status(500).json({
    status: 'error',
    message: 'Something went very wrong!', // Generic message
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
    return sendErrorDev(err, res);
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

    return sendErrorProd(error, res);
  }
};
