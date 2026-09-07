const asyncHandler = require('express-async-handler');
const MenuItem = require('../models/menuItemModel');

const CATEGORIES = ['starter', 'main', 'dessert', 'beverage', 'combo'];

const getMenuItems = asyncHandler(async (req, res) => {
  const filter = { restaurant: req.restaurantId };

  const { category, isVeg, available } = req.query;
  if (category) {
    if (!CATEGORIES.includes(category)) {
      res.status(400);
      throw new Error(`category must be one of: ${CATEGORIES.join(', ')}`);
    }
    filter.category = category;
  }
  if (isVeg !== undefined) filter.isVeg = isVeg === 'true';
  if (available !== undefined) filter.available = available === 'true';

  const items = await MenuItem.find(filter).sort({ category: 1, name: 1 });
  res.json(items);
});

const createMenuItem = asyncHandler(async (req, res) => {
  const { name, description, price, category, isVeg, tags, image, available } = req.body;

  if (!name || typeof name !== 'string' || !name.trim()) {
    res.status(400);
    throw new Error('name is required');
  }
  if (price === undefined || price === null || price === '') {
    res.status(400);
    throw new Error('price is required');
  }

  const numericPrice = Number(price);
  if (!Number.isFinite(numericPrice) || numericPrice < 0) {
    res.status(400);
    throw new Error('price must be a number greater than or equal to 0');
  }
  if (category && !CATEGORIES.includes(category)) {
    res.status(400);
    throw new Error(`category must be one of: ${CATEGORIES.join(', ')}`);
  }
  if (tags !== undefined && !Array.isArray(tags)) {
    res.status(400);
    throw new Error('tags must be an array of strings');
  }

  const item = await MenuItem.create({

    restaurant: req.restaurantId,
    name: name.trim(),
    description,
    price: numericPrice,
    category: category || 'main',
    isVeg: Boolean(isVeg),
    tags,
    image,
    ...(available !== undefined ? { available: Boolean(available) } : {}),
  });

  res.status(201).json(item);
});

module.exports = { getMenuItems, createMenuItem };
