const mongoose = require('mongoose');
const Tour = require('./tourModel');

const reviewSchema = new mongoose.Schema(
  {
    review: {
      type: String,
      required: [true, 'Review cannot be empty'],
      trim: true,
    },
    rating: {
      type: Number,
      required: [true, 'Review must have a rating'],
      min: [1, 'Rating must be at least 1'],
      max: [5, 'Rating must be at most 5'],
    },
    createdAt: {
      type: Date,
      default: Date.now,
    },
    tour: {
      type: mongoose.Schema.ObjectId,
      ref: 'Tour',
      required: [true, 'Review must belong to a tour'],
    },
    user: {
      type: mongoose.Schema.ObjectId,
      ref: 'User',
      required: [true, 'Review must belong to a user'],
    },
  },
  {
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  },
);

// ✅ Prevent user from creating a second review for same tour
reviewSchema.index({ tour: 1, user: 1 }, { unique: true });

// ✅ Auto-populate user and tour info
reviewSchema.pre(/^find/, function (next) {
  //   this.populate({
  //     path: 'tour',
  //     select: 'name', // choose only what field you want
  //   }).populate({
  //     path: 'user',
  //     select: 'name photo',
  //   });

  //   next();
  // });
  this.populate({
    path: 'user',
    select: 'name photo',
  });

  next();
});

// This code is from a Mongoose (MongoDB) model and is used to
// calculate and update the average rating and number of
// ratings for a Tour whenever a Review is saved.
// Static methods are called on the model itself, not on individual documents.
// static methods do not exist on documents
reviewSchema.statics.calcAverageRating = async function (tourId) {
  // this refers to the Review model
  // aggregate() runs a MongoDB aggregation pipeline to compute statistics.
  const stats = await this.aggregate([
    {
      // filters reviews only for this tour
      $match: { tour: tourId },
    },
    {
      // Groups all matched reviews by tour
      $group: {
        _id: '$tour',
        // calc. nRating → total number of reviews
        nRating: { $sum: 1 },
        // calc. average value of the rating field
        avgRating: { $avg: '$rating' },
      },
    },
  ]);
  // console.log(stats);
  // Update the corresponding tour document
  // This denormalizes data so the Tour always has up-to-date rating info
  if (stats.length > 0) {
    await Tour.findByIdAndUpdate(tourId, {
      ratingsQuantity: stats[0].nRating,
      ratingsAverage: stats[0].avgRating,
    });
  } else {
    // replace with default values
    await Tour.findByIdAndUpdate(tourId, {
      ratingsQuantity: 0,
      ratingsAverage: 4.5,
    });
  }
};

// Automatically recalculates ratings every time a new review is added
reviewSchema.post('save', function () {
  // this refers to the saved review document
  // this.constructor refers to the Review model
  this.constructor.calcAverageRating(this.tour);
});

// UPDATE / DELETE REVIEW
// 🔹 PRE: get the document BEFORE it changes
reviewSchema.pre(/^findOneAnd/, async function (next) {
  this.review = await this.clone().findOne();
  next();
});

// 🔹 POST: recalc ratings AFTER update/delete
reviewSchema.post(/^findOneAnd/, async function () {
  if (this.review) {
    await this.review.constructor.calcAverageRating(this.review.tour);
  }
});

const Review = mongoose.model('Review', reviewSchema);

module.exports = Review;
