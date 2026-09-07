const jwt = require('jsonwebtoken');
const asyncHandler = require('express-async-handler');
const User = require('../models/userModel');

const protect = asyncHandler(async (req, res, next) => {
  const header = req.headers.authorization;

  if (!header || !header.startsWith('Bearer ')) {
    res.status(401);
    throw new Error('Not authorized, no token');
  }

  const token = header.split(' ')[1];
  let user;

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    user = await User.findById(decoded.id).select('-password').populate('restaurant');
  } catch (error) {
    res.status(401);
    throw new Error('Not authorized, token failed');
  }

  if (!user) {
    res.status(401);
    throw new Error('Not authorized, user no longer exists');
  }
  if (!user.restaurant) {
    res.status(403);
    throw new Error('User is not linked to a restaurant');
  }

  req.user = user;
  next();
});

const adminOnly = (req, res, next) => {
  if (req.user?.role !== 'admin') {
    res.status(403);
    throw new Error('Access denied: admin role required');
  }
  next();
};

module.exports = { protect, adminOnly };
