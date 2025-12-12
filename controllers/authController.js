const crypto = require('crypto');
const { promisify } = require('util');
const jwt = require('jsonwebtoken');
const User = require('../models/userModel');
const catchAsync = require('../utils/catchAsync');
const AppError = require('../utils/appError');
const sendEmail = require('../utils/email');

const signToken = (id) => {
  return jwt.sign({ id }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN,
  });
};

const createSendToken = (user, statusCode, res) => {
  const token = signToken(user._id);

  const cookieOptions = {
    expires: new Date(
      Date.now() + process.env.JWT_COOKIE_EXPIRES_IN * 24 * 60 * 60 * 1000,
    ),
    // secure: true, cookie will only be sent on encrypted connection
    httpOnly: true, // cookie can not be accessed or modified by the browser
  };
  // only want secure option in production
  if (process.env.NODE_ENV === 'production') cookieOptions.secure = true;

  // create and send a cookie: ('name', data, options)
  res.cookie('jwt', token, cookieOptions);

  // remove password from output
  user.password = undefined;

  res.status(statusCode).json({
    status: 'success',
    token,
    data: {
      user,
    },
  });
};

// signup new user
exports.signup = catchAsync(async (req, res, next) => {
  const newUser = await User.create({
    // preventing role escalation by not allowing role to be set via req.body
    // admin role to be set only via DB or special admin routes.
    name: req.body.name,
    email: req.body.email,
    password: req.body.password,
    passwordConfirm: req.body.passwordConfirm,
    passwordChangedAt: req.body.passwordChangedAt,
    passwordResetToken: req.body.passwordResetToken,
    passwordResetExpires: req.body.passwordResetExpires,
    role: req.body.role,
  });
  // log user in by sending JWT upon successful signup
  createSendToken(newUser, 201, res);
});

// login user with email and password
exports.login = catchAsync(async (req, res, next) => {
  // read email and password from request body
  const { email, password } = req.body;

  // 1) Check if email and password exist
  if (!email || !password) {
    return next(new AppError('Please provide email and password!', 400));
  }
  // 2) Check if user exists && password is correct
  const user = await User.findOne({ email }).select('+password');

  // correctPassword method defined in userModel.js
  if (!user || !(await user.correctPassword(password, user.password))) {
    return next(new AppError('Incorrect email or password', 401));
  }

  // 3) If everything ok, send token to client
  createSendToken(user, 200, res);

  // 4) Remove password from output
  user.password = undefined;
});

// middleware to protect routes - only allow access if user is logged in
exports.protect = catchAsync(async (req, res, next) => {
  // 1) Getting token and check if it's there
  let token;
  if (
    req.headers.authorization &&
    req.headers.authorization.startsWith('Bearer')
  ) {
    token = req.headers.authorization.split(' ')[1];
  }

  if (!token) {
    return next(
      new AppError('You are not logged in! Please log in to get access.', 401),
    );
  }
  // 2) Verification token
  const decoded = await promisify(jwt.verify)(token, process.env.JWT_SECRET);
  // console.log(decoded);
  /* 
  { id: 'testb2d109a80176sass4a3', iat: 1765307068, exp: 1773083068 }
   */
  // 3) Check if user still exists
  const currentUser = await User.findById(decoded.id);
  // console.log(currentUser);
  /*
  {
  _id: new ObjectId('testb2d109a80176sass4a3'),
  name: 'stuart',
  email: 'test@gmail.com',
  photo: 'default.jpg',
  role: 'user',
  __v: 0
}
  */
  if (!currentUser) {
    return next(
      new AppError('The user belonging to this token no longer exists.', 401),
    );
  }
  // check if user changed password after the token was issued
  if (currentUser.changedPasswordAfter(decoded.iat)) {
    return next(
      new AppError('User recently changed password! Please log in again.', 401),
    );
  }
  // GRANT ACCESS TO PROTECTED ROUTE
  // req.user travels to the next middleware making the user data available there.
  req.user = currentUser;
  next();
});

// only allow access to certain roles
exports.restrictTo = (...roles) => {
  return (req, res, next) => {
    // roles is an array ['admin', 'lead-guide']. role='user'
    if (!roles.includes(req.user.role)) {
      // user is NOT in the allowed list
      return next(
        new AppError('You do not have permission to perform this action', 403),
      );
    }
    next(); // if user has appropriate role, allow to proceed
  };
};

// for forgotten passwords
exports.forgotPassword = catchAsync(async (req, res, next) => {
  // 1) Get user based on POSTed email
  const user = await User.findOne({ email: req.body.email });
  if (!user) {
    return next(new AppError('There is no user with that email address.', 404));
  }

  // 2) Generate the random reset token
  const resetToken = user.createPasswordResetToken();
  await user.save({ validateBeforeSave: false }); // deactivate validators in the schema

  // 3) Send it to user's email
  const resetURL = `${req.protocol}://${req.get('host')}/api/v1/users/resetPassword/${resetToken}`;

  const message = `Forgot your password? Submit a PATCH request with your new password and passwordConfirm to: ${resetURL}.\nIf you didn't forget your password, please ignore this email!`;

  try {
    await sendEmail({
      email: user.email,
      subject: 'Your password reset token (valid for 10 min)',
      message,
    });
    res.status(200).json({
      status: 'success',
      message: 'Token sent to email!',
      //resetToken,
    });
  } catch (err) {
    user.passwordResetToken = undefined;
    user.passwordResetExpires = undefined;
    await user.save({ validateBeforeSave: false });

    return next(
      new AppError(
        'There was an error sending the email. Try again later!',
        500,
      ),
    );
  }
});

// for resetting passwords
exports.resetPassword = catchAsync(async (req, res, next) => {
  // 1) Get user based on the token
  const hashedToken = crypto
    .createHash('sha256')
    .update(req.params.token)
    .digest('hex');

  const user = await User.findOne({
    passwordResetToken: hashedToken,
    passwordResetExpires: { $gt: Date.now() },
  });

  // 2) If token has not expired, and there is user, set the new password
  if (!user) {
    return next(new AppError('Token is invalid or has expired', 400));
  }
  user.password = req.body.password;
  user.passwordConfirm = req.body.passwordConfirm;
  user.passwordResetToken = undefined;
  user.passwordResetExpires = undefined;
  await user.save();
  // 3) Update changedPasswordAt property for the user
  // done in userModel pre 'save' middleware
  createSendToken(user, 200, res);
});

// for updating a users passwords already logged in
// requires user to input current password for verification.
exports.updatePassword = catchAsync(async (req, res, next) => {
  // 1) Get user from collection.
  // the current user has been placed in the req. object by the protect middleware
  // must explicitly ask for password since it is not included in the output
  // as defined by the schema
  const user = await User.findById(req.user.id).select('+password');
  // 2) check if POSTed current password is correct
  // req.body.passwordCurrent will be submitted in the body user.password is the actual password
  // correctPassword is a userSchema method in userModel.js
  if (!(await user.correctPassword(req.body.passwordCurrent, user.password))) {
    return next(new AppError('Your current password is wrong.', 401));
  }
  // 3) If correct, update password
  user.password = req.body.password;
  user.passwordConfirm = req.body.passwordConfirm;
  await user.save();

  // 4) log user in, send jwt
  createSendToken(user, 200, res);
});
