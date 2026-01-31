// The main app file where the Express app, middlewares, and routes are defined.
const path = require('path');
const express = require('express');
const morgan = require('morgan');
const rateLimit = require('express-rate-limit');
const helmet = require('helmet');
const mongosanitize = require('express-mongo-sanitize');
const xss = require('xss-clean');
const hpp = require('hpp');
const cookieParser = require('cookie-parser');

const AppError = require('./utils/appError');
const globalErrorHandler = require('./controllers/errorController');
const tourRouter = require('./routes/tourRoutes');
const userRouter = require('./routes/userRoutes');
const reviewRouter = require('./routes/reviewRoutes');
const viewRouter = require('./routes/viewRoutes');

const app = express();

app.set('view engine', 'pug');
app.set('views', path.join(__dirname, 'views'));

//////////////// Global Middleware ////////////////
// serving static files
app.use(express.static(path.join(__dirname, 'public')));

// set security HTTP headers
const scriptSrcUrls = [
  'https://api.tiles.mapbox.com/',
  'https://api.mapbox.com/',
  'https://*.cloudflare.com',
  'https://cdn.jsdelivr.net', // ✅ Axios
  'https://unpkg.com', // ✅ Leaflet
];

const styleSrcUrls = [
  'https://api.mapbox.com/',
  'https://unpkg.com', // ✅ Leaflet CSS
  'https://api.tiles.mapbox.com/',
  'https://fonts.googleapis.com/',
  'https://www.myfonts.com/fonts/radomir-tinkov/gilroy/*',
];

const connectSrcUrls = [
  'https://*.mapbox.com/',
  'https://*.cloudflare.com',
  'https://*.cartocdn.com', // ✅ Carto
  'https://*.fastly.net', // ✅ Carto CDN
  'http://localhost:8000',
  'http://127.0.0.1:8000',
];

const fontSrcUrls = ['fonts.googleapis.com', 'fonts.gstatic.com'];

// 👇 DEV ONLY
if (process.env.NODE_ENV === 'development') {
  connectSrcUrls.push(
    'ws://localhost:1234',
    'ws://127.0.0.1:1234',
    'http://localhost:1234',
    'http://127.0.0.1:1234',
  );
  scriptSrcUrls.push("'unsafe-eval'");
}

app.use(
  helmet.contentSecurityPolicy({
    directives: {
      defaultSrc: ["'self'"],
      connectSrc: ["'self'", ...connectSrcUrls],
      scriptSrc: ["'self'", ...scriptSrcUrls],
      styleSrc: ["'self'", "'unsafe-inline'", ...styleSrcUrls],
      workerSrc: ["'self'", 'blob:'],
      objectSrc: [],
      imgSrc: [
        "'self'",
        'blob:',
        'data:',
        'https://*.cartocdn.com', // ✅ tiles
        'https://*.fastly.net', // ✅ tiles
      ],
      fontSrc: ["'self'", ...fontSrcUrls],
    },
  }),
);

if (process.env.NODE_ENV === 'development') {
  app.use(morgan('dev'));
}

// limit requests from same API
const limiter = rateLimit({
  max: 100, // 100 requests
  windowMs: 60 * 60 * 1000, // 1hr
  message: 'Too many request from this IP, please try again in 1hr!',
});

// limit access to api route
app.use('/api', limiter);

// body parser, reading data from the body in to req.body
app.use(express.json({ limit: '10Kb' }));
app.use(express.urlencoded({ extended: true, limit: '10kb' }));
// parse the data from the cookie
app.use(cookieParser());

// data sanitization against NoSQL query injection {$gt: ""}
app.use(mongosanitize());

// data sanitization against Cross-site scripting (XSS)
app.use(xss());

// prevent parameter pollution, clear up query string
app.use(
  hpp({
    whitelist: [
      'duration',
      'ratingsQuantity',
      'ratingsAverage',
      'maxGroupSize',
      'difficulty',
      'price',
    ],
  }),
);

// test middleware
app.use((req, res, next) => {
  req.requestTime = new Date().toISOString();
  console.log(req.cookies);
  next();
});

//////////////// Routes ////////////////
app.use('/', viewRouter);
app.use('/api/v1/tours', tourRouter);
app.use('/api/v1/users', userRouter);
app.use('/api/v1/reviews', reviewRouter);

app.all('*', (req, res, next) => {
  next(new AppError(`Can't find ${req.originalUrl} on this server!`, 404));
});

// global error handling middleware
app.use(globalErrorHandler);

module.exports = app;
