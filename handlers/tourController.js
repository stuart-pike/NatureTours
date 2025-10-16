const fs = require('fs');

const tours = JSON.parse(
  fs.readFileSync(`${__dirname}/../dev-data/data/tours-simple.json`)
);

const checkID = (req, res, next, val) => {
  console.log(`Tour id is: ${val}`);
  if (req.params.id * 1 > tours.length) {
    return res.status(404).json({
      status: 'fail',
      message: 'Invalid ID',
    });
  }
  next();
};

const checkBody = (req, res, next) => {
  if (!req.body.name || !req.body.price) {
    return res.status(400).json({
      status: 'fail',
      message: 'Missing name or price',
    });
  }
  next();
};

const getAllTours = (req, res) => {
  console.log(req.requestTime);
  res
    .status(200)
    // reformat response using the JSend data specification
    .json({
      status: 'success',
      timeRequested: req.requestTime,
      results: tours.length, // this is not part of JSend spec. but useful
      data: {
        tours,
      },
    });
};

const getTour = (req, res) => {
  // req.params is where express puts all the url parameters
  console.log(req.params);

  // + converts string to number
  const tour = tours.find((el) => el.id === +req.params.id);

  res
    .status(200)
    // reformat response using the JSend data specification
    .json({
      status: 'successs',
      data: {
        tour,
      },
    });
};

const createTour = (req, res) => {
  // console.log(req.body);
  const newId = tours[tours.length - 1].id + 1;
  // Object.assign() merges two objects. Here we create a new object
  // that has the new id and all the data that was sent in the request body
  // req.body is where express puts all the body data
  const newTour = Object.assign({ id: newId }, req.body);
  // add the new tour to the tours array
  tours.push(newTour);

  fs.writeFile(
    `${__dirname}/dev-data/data/tours-simple.json`,
    JSON.stringify(tours),
    (err) => {
      // 201: created
      res.status(201).json({
        status: 'success',
        data: {
          tour: newTour,
        },
      });
    }
  );
};

const updateTour = (req, res) => {
  // req.params is where express puts all the url parameters
  console.log(req.params);

  // + converts string to number
  const tour = tours.find((el) => el.id === +req.params.id);

  // Update the tour
  Object.assign(tour, req.body);

  fs.writeFile(
    `${__dirname}/dev-data/data/tours-simple.json`,
    JSON.stringify(tours),
    (err) => {
      res.status(200).json({
        status: 'success',
        data: {
          tour,
        },
      });
    }
  );
};

const deleteTour = (req, res) => {
  // 204 no content to send back
  res.status(204).json({
    status: 'success',
    data: null,
  });
};

module.exports = {
  getAllTours,
  getTour,
  createTour,
  updateTour,
  deleteTour,
  checkID,
  checkBody,
};
