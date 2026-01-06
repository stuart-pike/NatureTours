const mongoose = require('mongoose');
const slugify = require('slugify');
//const User = require('./userModel');

const tourSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'A tour must have a name'],
      unique: true, // MongoDB will auto create index
      trim: true,
      maxlength: [40, 'A tour name must have less or equal than 40 characters'],
      minlength: [5, 'A tour name must have more or equal than 5 characters'],
      //validator: [validator.isAlpha, 'Tour name must, only contain characters'],
    },
    slug: String,
    duration: {
      type: Number,
      required: [true, 'A tour must have a duration'],
    },
    maxGroupSize: {
      type: Number,
      required: [true, 'A tour must have a group size'],
    },
    difficulty: {
      type: String,
      required: [true, 'A tour must have a difficulty'],
      enum: {
        values: ['easy', 'medium', 'difficult'],
        message: 'Difficulty must be either: easy, medium, or difficult',
      },
    },
    ratingsAverage: {
      type: Number,
      default: 4.5,
      min: [1, 'Rating must be above 1.0'],
      max: [5, 'Rating must be below 5.0'],
      set: (val) => Math.round(val * 10) / 10, // e.g. 4.666 => 4.7
    },
    ratingsQuantity: {
      type: Number,
      default: 0,
    },
    price: {
      type: Number,
      required: [true, 'A tour must have a price'],
    },
    priceDiscount: {
      type: Number,
      validate: {
        validator: function (val) {
          // Custom validator to check that discount price is less than regular price
          return val < this.price;
        },
        message: 'Discount price ({VALUE}) must be less than regular price',
      },
    },
    summary: {
      type: String,
      trim: true,
      required: [true, 'A tour must have a summary'],
    },
    description: {
      type: String,
      trim: true,
    },
    imageCover: {
      type: String,
      required: [true, 'A tour must have a cover image'],
    },
    images: [String],
    createdAt: {
      type: Date,
      default: Date.now(),
      select: false, // hides this field from query results by default
    },
    startDates: [Date],
    secretTour: {
      type: Boolean,
      default: false,
    },
    // Object to spec geospacial data in MongoDB
    startLocation: {
      type: {
        type: String,
        default: 'Point',
        enum: ['Point'],
      },
      coordinates: [Number],
      address: String,
      description: String,
    },
    locations: [
      {
        type: {
          type: String,
          default: 'Point',
          enum: ['Point'],
        },
        coordinates: [Number],
        address: String,
        description: String,
        day: Number,
      },
    ],
    // guides: Array, // Embedding guides
    // Create reference to another model
    guides: [{ type: mongoose.Schema.ObjectId, ref: 'User' }],
  },
  {
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  },
);

// Improve DB read performace using indexes
// sorting price in assending order ratingsAve in decenfing order.
// Chose indexes that make the most sense.
tourSchema.index({ price: 1, ratingsAverage: -1 });
tourSchema.index({ slug: 1 });
// Start location indexed to a 2D sphere
tourSchema.index({ startLocation: '2dsphere' });

tourSchema.virtual('durationWeeks').get(function () {
  return this.duration / 7;
});

// virtual populate
tourSchema.virtual('reviews', {
  ref: 'Review', // name of the model to reference
  foreignField: 'tour', // spec the name used in the Review model
  localField: '_id', // spec name used in the local (tour) model
});

// Document Middleware: runs before .save() and .create() commands only
tourSchema.pre('save', function (next) {
  this.slug = slugify(this.name, { lower: true });
  next();
});

// EMBEDDING tour guides into a new tour document in db
// tourSchema.pre('save', async function (next) {
//   const guidesPromises = this.guides.map(async (id) => await User.findById(id));
//   this.guides = await Promise.all(guidesPromises);
//   next();
// });

// tourSchema.pre('save', function (next) {
//   console.log('💾 Will save document...');
//   next();
// });

// tourSchema.post('save', function (doc, next) {
//   console.log('💾 Document saved:', doc);
//   next();
// });

// Run this middleware BEFORE any Mongoose method whose name starts with find.
// Query middleware to exclude secret tours from any find query
// tourSchema.pre('find', function (next) {
tourSchema.pre(/^find/, function (next) {
  this.find({ secretTour: { $ne: true } });
  this.start = Date.now();

  next();
});

// populate the tours with the guides.
// works like an additional query, thus population is expensive.
tourSchema.pre(/^find/, function (next) {
  // 'this' is the query object, not the document.
  this.populate({
    path: 'guides',
    select: '-__v -passwordChangedAt',
  });

  next();
});

tourSchema.post(/^find/, function (docs, next) {
  //console.log('💾 Documents found:', docs);
  //console.log(`⏰ Query took ${Date.now() - this.start} milliseconds!`);
  next();
});

/*
// Aggregation Middleware: runs before .aggregate() commands only
tourSchema.pre('aggregate', function (next) {
  // Exclude secret tours from aggregation results
  this.pipeline().unshift({ $match: { secretTour: { $ne: true } } });

  console.log(this.pipeline());
  next();
});
*/

const Tour = mongoose.model('Tour', tourSchema);

module.exports = Tour;
