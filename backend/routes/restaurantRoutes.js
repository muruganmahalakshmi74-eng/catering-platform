const express = require('express');
const router = express.Router();

const { getRestaurant, listRestaurants } = require('../controllers/restaurantController');
const { getMenuItems, createMenuItem } = require('../controllers/menuController');
const { getPackages, createPackage } = require('../controllers/packageController');
const { getOrders, createOrder, updateOrderStatus } = require('../controllers/orderController');
const { recommend } = require('../controllers/recommendationController');
const { protect } = require('../middleware/authMiddleware');
const { checkRestaurantAccess } = require('../middleware/restaurantMiddleware');

router.use(protect);

router.get('/', listRestaurants);
router.get('/:id', checkRestaurantAccess, getRestaurant);

router
  .route('/:restaurantId/menu')
  .get(checkRestaurantAccess, getMenuItems)
  .post(checkRestaurantAccess, createMenuItem);

router
  .route('/:restaurantId/packages')
  .get(checkRestaurantAccess, getPackages)
  .post(checkRestaurantAccess, createPackage);

router
  .route('/:restaurantId/orders')
  .get(checkRestaurantAccess, getOrders)
  .post(checkRestaurantAccess, createOrder);

router.patch('/:restaurantId/orders/:orderId/status', checkRestaurantAccess, updateOrderStatus);

router.post('/:restaurantId/recommend', checkRestaurantAccess, recommend);

module.exports = router;
