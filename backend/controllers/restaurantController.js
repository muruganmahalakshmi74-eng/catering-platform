const asyncHandler = require('express-async-handler');
const Restaurant = require('../models/restaurantModel');

const getRestaurant = asyncHandler(async (req, res) => {
  const restaurant = await Restaurant.findById(req.params.id);
  if (!restaurant) {
    res.status(404);
    throw new Error('Restaurant not found');
  }
  res.json(restaurant);
});

const listRestaurants = asyncHandler(async (req, res) => {
  const restaurantId = req.user.restaurant._id || req.user.restaurant;
  const restaurants = await Restaurant.find({ _id: restaurantId });
  res.json(restaurants);
});

module.exports = { getRestaurant, listRestaurants };
