const asyncHandler = require('express-async-handler');
const CateringPackage = require('../models/cateringPackageModel');
const MenuItem = require('../models/menuItemModel');

const getPackages = asyncHandler(async (req, res) => {
  const filter = { restaurant: req.restaurantId };

  const { isVeg, available, maxPricePerPerson } = req.query;
  if (isVeg !== undefined) filter.isVeg = isVeg === 'true';
  if (available !== undefined) filter.available = available === 'true';
  if (maxPricePerPerson !== undefined) {
    const max = Number(maxPricePerPerson);
    if (!Number.isFinite(max) || max < 0) {
      res.status(400);
      throw new Error('maxPricePerPerson must be a non-negative number');
    }
    filter.pricePerPerson = { $lte: max };
  }

  const packages = await CateringPackage.find(filter).populate('items').sort({ pricePerPerson: 1 });
  res.json(packages);
});

const createPackage = asyncHandler(async (req, res) => {
  const { name, description, pricePerPerson, minGuests, maxGuests, isVeg, tags, items, image, available } = req.body;

  if (!name || typeof name !== 'string' || !name.trim()) {
    res.status(400);
    throw new Error('name is required');
  }
  if (pricePerPerson === undefined || pricePerPerson === null || pricePerPerson === '') {
    res.status(400);
    throw new Error('pricePerPerson is required');
  }

  const price = Number(pricePerPerson);
  if (!Number.isFinite(price) || price < 0) {
    res.status(400);
    throw new Error('pricePerPerson must be a number greater than or equal to 0');
  }

  const min = minGuests === undefined ? 10 : Number(minGuests);
  const max = maxGuests === undefined ? 500 : Number(maxGuests);
  if (!Number.isInteger(min) || min < 1) {
    res.status(400);
    throw new Error('minGuests must be an integer of at least 1');
  }
  if (!Number.isInteger(max) || max < 1) {
    res.status(400);
    throw new Error('maxGuests must be an integer of at least 1');
  }
  if (min > max) {
    res.status(400);
    throw new Error('minGuests cannot be greater than maxGuests');
  }
  if (tags !== undefined && !Array.isArray(tags)) {
    res.status(400);
    throw new Error('tags must be an array of strings');
  }

  if (items !== undefined) {
    if (!Array.isArray(items)) {
      res.status(400);
      throw new Error('items must be an array of menu item ids');
    }
    if (items.length > 0) {
      const owned = await MenuItem.countDocuments({
        _id: { $in: items },
        restaurant: req.restaurantId,
      });
      if (owned !== items.length) {
        res.status(400);
        throw new Error('items must all be menu items belonging to this restaurant');
      }
    }
  }

  const pkg = await CateringPackage.create({
    restaurant: req.restaurantId,
    name: name.trim(),
    description,
    pricePerPerson: price,
    minGuests: min,
    maxGuests: max,
    isVeg: Boolean(isVeg),
    tags,
    items,
    image,
    ...(available !== undefined ? { available: Boolean(available) } : {}),
  });

  const populated = await pkg.populate('items');
  res.status(201).json(populated);
});

module.exports = { getPackages, createPackage };
