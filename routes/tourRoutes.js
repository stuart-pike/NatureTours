const express = require('express');
const tourController = require('../handlers/tourController');

const router = express.Router();

// middleware that runs for any route with the 'id' parameter in it;
// router.param('id', tourController.checkID);

router
  .route('/top5tours')
  .get(tourController.aliasTopTours, tourController.getAllTours);

router
  .route('/')
  .get(tourController.getAllTours)
  //.post(tourController.checkBody, tourController.createTour);
  .post(tourController.createTour);

router
  .route('/:id')
  .get(tourController.getTour)
  .patch(tourController.updateTour)
  .delete(tourController.deleteTour);

module.exports = router;
