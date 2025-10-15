const fs = require('fs');
const express = require('express');
const { create } = require('domain');

const app = express();

// middleware is a function that can modify this incomming request data
app.use(express.json());

const tours = JSON.parse(
  fs.readFileSync(`${__dirname}/dev-data/data/tours-simple.json`)
);

const getAllTours = (req, res) => {
  res
    .status(200)
    // reformat response using the JSend data specification
    .json({
      status: 'successs',
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

  if (!tour) {
    return res.status(404).json({
      status: 'fail',
      message: 'Invalid ID',
    });
  }
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
  if (req.params.id * 1 > tours.length) {
    return res.status(404).json({
      status: 'fail',
      message: 'Invalid ID',
    });
  }

  res.status(200).json({
    status: 'success',
    data: {
      tour: '<Updated tour here...>',
    },
  });
};

const deleteTour = (req, res) => {
  if (req.params.id * 1 > tours.length) {
    return res.status(404).json({
      status: 'fail',
      message: 'Invalid ID',
    });
  }
  // 204 no content to send back
  res.status(204).json({
    status: 'success',
    data: null,
  });
};

// Route handlers
app.route('/api/v1/tours').get(getAllTours).post(createTour);

app
  .route('/api/v1/tours/:id')
  .get(getTour)
  .patch(updateTour)
  .delete(deleteTour);

const port = 3000;
app.listen(port, () => {
  console.log(`App running on port ${port}...`);
});
