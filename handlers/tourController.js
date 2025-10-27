const Tour = require('../models/tourModel');
const APIFeatures = require('../utils/apiFeatures');

const aliasTopTours = (req, res, next) => {
  req.query.limit = '5';
  req.query.sort = '-ratingsAverage,price';
  req.query.fields = 'name,price,ratingsAverage,summary,difficulty';
  next();
};

const getAllTours = async (req, res) => {
  try {
    const features = new APIFeatures(Tour.find(), req.query);
    features.filter().sort().limitFields().paginate();
    const tours = await features.query;

    // Send response
    res.status(200).json({
      status: 'success',
      results: tours.length,
      data: {
        tours,
      },
    });
  } catch (err) {
    res.status(404).json({
      status: 'error',
      message: err.message,
    });
  }
};

const getTour = async (req, res) => {
  try {
    const { id } = req.params;

    // Validate MongoDB ObjectId before querying
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        status: 'fail',
        message: 'Invalid tour ID format',
      });
    }

    // Find tour by ID
    const tour = await Tour.findById(id);

    if (!tour) {
      return res.status(404).json({
        status: 'fail',
        message: 'No tour found with that ID',
      });
    }
    res.status(200).json({
      status: 'success',
      data: { tour },
    });
  } catch (err) {
    console.error('Error fetching tour:', err); // Helpful for debugging
    res.status(500).json({
      status: 'error',
      message: 'Something went wrong while retrieving the tour',
      error: err.message,
    });
  }
};

const createTour = async (req, res) => {
  try {
    const newTour = await Tour.create(req.body);
    res.status(201).json({
      status: 'success',
      data: { tour: newTour },
    });
  } catch (err) {
    res.status(err.name === 'ValidationError' ? 400 : 500).json({
      status: 'fail',
      message: err.message,
    });
  }
};

const updateTour = async (req, res) => {
  try {
    const { id } = req.params;

    // Validate MongoDB ObjectId before querying
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        status: 'fail',
        message: 'Invalid tour ID format',
      });
    }

    // Find tour by ID and update
    const tour = await Tour.findByIdAndUpdate(id, req.body, {
      new: true,
      runValidators: true,
    });

    if (!tour) {
      return res.status(404).json({
        status: 'fail',
        message: 'No tour found with that ID',
      });
    }

    res.status(200).json({
      status: 'success',
      data: { tour },
    });
  } catch (err) {
    console.error('Error updating tour:', err);
    res.status(500).json({
      status: 'error',
      message: 'Something went wrong while updating the tour',
      error: err.message,
    });
  }
};

const deleteTour = async (req, res) => {
  try {
    const { id } = req.params;

    // Validate MongoDB ObjectId before querying
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        status: 'fail',
        message: 'Invalid tour ID format',
      });
    }

    // Find tour by ID and delete
    const tour = await Tour.findByIdAndDelete(id);

    if (!tour) {
      return res.status(404).json({
        status: 'fail',
        message: 'No tour found with that ID',
      });
    }

    res.status(204).json({
      status: 'success',
      data: null,
    });
  } catch (err) {
    console.error('Error deleting tour:', err);
    res.status(500).json({
      status: 'error',
      message: 'Something went wrong while deleting the tour',
      error: err.message,
    });
  }
};

module.exports = {
  aliasTopTours,
  getAllTours,
  getTour,
  createTour,
  updateTour,
  deleteTour,
};
