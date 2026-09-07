const asyncHandler = require('express-async-handler');
const User = require('../models/userModel');
const generateToken = require('../utils/generateToken');

const publicUser = (user, restaurant) => ({
  _id: user._id,
  name: user.name,
  email: user.email,
  role: user.role,
  restaurant,
});

const register = asyncHandler(async (req, res) => {
  const { name, email, password, role } = req.body;

  if (!name || !email || !password) {
    res.status(400);
    throw new Error('name, email and password are required');
  }
  if (typeof password !== 'string' || password.length < 6) {
    res.status(400);
    throw new Error('password must be at least 6 characters');
  }
  if (role && !['admin', 'staff'].includes(role)) {
    res.status(400);
    throw new Error("role must be either 'admin' or 'staff'");
  }

  const normalisedEmail = String(email).toLowerCase().trim();
  const exists = await User.findOne({ email: normalisedEmail });
  if (exists) {
    res.status(409);
    throw new Error('A user with this email already exists');
  }

  const restaurantId = (req.user.restaurant._id || req.user.restaurant).toString();

  const user = await User.create({
    name,
    email: normalisedEmail,
    password,
    role: role || 'staff',
    restaurant: restaurantId,
  });

  res.status(201).json({
    ...publicUser(user, restaurantId),
    token: generateToken(user._id),
  });
});

const login = asyncHandler(async (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    res.status(400);
    throw new Error('email and password are required');
  }

  const user = await User.findOne({ email: String(email).toLowerCase().trim() }).populate('restaurant');

  if (!user || !(await user.matchPassword(password))) {
    res.status(401);
    throw new Error('Invalid email or password');
  }

  res.json({
    ...publicUser(user, user.restaurant),
    token: generateToken(user._id),
  });
});

const getProfile = asyncHandler(async (req, res) => {
  res.json(publicUser(req.user, req.user.restaurant));
});

module.exports = { register, login, getProfile };
