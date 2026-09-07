const asyncHandler = require('express-async-handler');
const mongoose = require('mongoose');
const Order = require('../models/orderModel');
const CateringPackage = require('../models/cateringPackageModel');

const ORDER_STATUSES = ['pending', 'confirmed', 'preparing', 'delivered', 'cancelled'];
const EMAIL_RE = /^\S+@\S+\.\S+$/;
const PHONE_RE = /^[0-9+\-\s()]{7,20}$/;

const getOrders = asyncHandler(async (req, res) => {
  const filter = { restaurant: req.restaurantId };

  const { status } = req.query;
  if (status) {
    if (!ORDER_STATUSES.includes(status)) {
      res.status(400);
      throw new Error(`status must be one of: ${ORDER_STATUSES.join(', ')}`);
    }
    filter.status = status;
  }

  const orders = await Order.find(filter)
    .populate('cateringPackage')
    .populate('createdBy', 'name email')
    .sort({ createdAt: -1 });

  res.json(orders);
});

const createOrder = asyncHandler(async (req, res) => {
  const {
    customerName,
    customerPhone,
    customerEmail,
    cateringPackage,
    guestCount,
    eventDate,
    specialRequests,
  } = req.body;

  if (!customerName || !String(customerName).trim()) {
    res.status(400);
    throw new Error('customerName is required');
  }
  if (!cateringPackage) {
    res.status(400);
    throw new Error('cateringPackage is required');
  }
  if (!mongoose.Types.ObjectId.isValid(cateringPackage)) {
    res.status(400);
    throw new Error('cateringPackage must be a valid package id');
  }
  if (guestCount === undefined || guestCount === null || guestCount === '') {
    res.status(400);
    throw new Error('guestCount is required');
  }
  if (!eventDate) {
    res.status(400);
    throw new Error('eventDate is required');
  }

  const guests = Number(guestCount);
  if (!Number.isInteger(guests) || guests < 1) {
    res.status(400);
    throw new Error('guestCount must be a whole number of at least 1');
  }
  if (customerEmail && !EMAIL_RE.test(customerEmail)) {
    res.status(400);
    throw new Error('customerEmail must be a valid email address');
  }
  if (customerPhone && !PHONE_RE.test(customerPhone)) {
    res.status(400);
    throw new Error('customerPhone must be a valid phone number');
  }

  const event = new Date(eventDate);
  if (isNaN(event.getTime())) {
    res.status(400);
    throw new Error('eventDate is not a valid date');
  }

  const startOfToday = new Date();
  startOfToday.setHours(0, 0, 0, 0);
  if (event < startOfToday) {
    res.status(400);
    throw new Error('eventDate must be today or in the future');
  }

  const pkg = await CateringPackage.findById(cateringPackage);
  if (!pkg) {
    res.status(404);
    throw new Error('Catering package not found');
  }

  if (pkg.restaurant.toString() !== req.restaurantId) {
    res.status(403);
    throw new Error('Catering package does not belong to this restaurant');
  }
  if (!pkg.available) {
    res.status(400);
    throw new Error(`Package '${pkg.name}' is not currently available`);
  }
  if (guests < pkg.minGuests || guests > pkg.maxGuests) {
    res.status(400);
    throw new Error(
      `guestCount must be between ${pkg.minGuests} and ${pkg.maxGuests} for '${pkg.name}'`
    );
  }

  const totalPrice = pkg.pricePerPerson * guests;

  const order = await Order.create({
    restaurant: req.restaurantId,
    customerName: String(customerName).trim(),
    customerPhone,
    customerEmail,
    cateringPackage,
    guestCount: guests,
    eventDate: event,
    totalPrice,
    specialRequests,
    createdBy: req.user._id,
  });

  const populated = await order.populate('cateringPackage');
  res.status(201).json(populated);
});

const updateOrderStatus = asyncHandler(async (req, res) => {
  const { status } = req.body;

  if (!status || !ORDER_STATUSES.includes(status)) {
    res.status(400);
    throw new Error(`status must be one of: ${ORDER_STATUSES.join(', ')}`);
  }
  if (!mongoose.Types.ObjectId.isValid(req.params.orderId)) {
    res.status(400);
    throw new Error('Invalid order id');
  }

  const order = await Order.findOne({
    _id: req.params.orderId,
    restaurant: req.restaurantId,
  });
  if (!order) {
    res.status(404);
    throw new Error('Order not found');
  }

  order.status = status;
  await order.save();

  const populated = await order.populate('cateringPackage');
  res.json(populated);
});

module.exports = { getOrders, createOrder, updateOrderStatus };
