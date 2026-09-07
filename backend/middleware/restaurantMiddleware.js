const mongoose = require('mongoose');
const asyncHandler = require('express-async-handler');

const checkRestaurantAccess = asyncHandler(async (req, res, next) => {
  const requestedRestaurantId = req.params.restaurantId || req.params.id;

  if (!requestedRestaurantId) {
    return next();
  }
  if (!mongoose.Types.ObjectId.isValid(requestedRestaurantId)) {
    res.status(400);
    throw new Error('Invalid restaurant id');
  }

  const userRestaurant = req.user.restaurant;
  const userRestaurantId = (userRestaurant._id || userRestaurant).toString();

  if (userRestaurantId !== requestedRestaurantId.toString()) {
    res.status(403);
    throw new Error('Access denied: You can only access your own restaurant data');
  }

  req.restaurantId = userRestaurantId;
  next();
});

module.exports = { checkRestaurantAccess };
