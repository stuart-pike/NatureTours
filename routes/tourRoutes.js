const express = require('express');
const tourController = require('../controllers/tourController');
const authController = require('../controllers/authController');

const router = express.Router();

// middleware that runs for any route with the 'id' parameter in it;
// router.param('id', tourController.checkID);

router
  .route('/top5tours')
  .get(tourController.aliasTopTours, tourController.getAllTours);

router.route('/tour-stats').get(tourController.getToursStats);
router.route('/monthly-plan/:year').get(tourController.getMonthlyPlan);

router
  .route('/')
  // put a check in place to allow only authenticated users to access this route
  // to achieve this, use a middleware func. from authController.js
  // middleware will run before the getAllTours controller func. and return
  // an error if user is not authenticated
  .get(authController.protect, tourController.getAllTours)
  .post(tourController.createTour);

router
  .route('/:id')
  .get(tourController.getTour)
  .patch(tourController.updateTour)
  // validate user is authenticated and has appropriate role before allowing delete
  .delete(
    authController.protect,
    //pass in roles that are allowed to delete tours
    authController.restrictTo('admin', 'lead-guide'),
    tourController.deleteTour,
  );

module.exports = router;
