const asyncHandler = require('express-async-handler');
const CateringPackage = require('../models/cateringPackageModel');
const MenuItem = require('../models/menuItemModel');
const { parseQuery, scoreAndRank } = require('../utils/recommendationService');

const recommend = asyncHandler(async (req, res) => {
  const { query } = req.body;

  if (typeof query !== 'string' || !query.trim()) {
    res.status(400);
    throw new Error('query is required and must be a non-empty string');
  }
  if (query.length > 1000) {
    res.status(400);
    throw new Error('query must be 1000 characters or fewer');
  }

  const parsed = parseQuery(query);

  const restaurantId = req.restaurantId;

  const packageFilter = { restaurant: restaurantId, available: true };

  if (parsed.isVeg === true) packageFilter.isVeg = true;

  const menuFilter = { restaurant: restaurantId, available: true };
  if (parsed.isVeg === true) menuFilter.isVeg = true;

  const [packages, menuItems] = await Promise.all([
    CateringPackage.find(packageFilter).populate('items'),
    MenuItem.find(menuFilter),
  ]);

  const { recommendations, alternatives, menuItemSuggestions, explanation } = scoreAndRank(
    packages,
    menuItems,
    parsed
  );

  res.json({
    restaurantId,
    query,
    parsed,
    explanation,
    recommendations,
    alternatives,
    menuItemSuggestions,
    candidatesConsidered: packages.length,
  });
});

module.exports = { recommend };
