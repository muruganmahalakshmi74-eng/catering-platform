const mongoose = require('mongoose');

const menuItemSchema = mongoose.Schema(
  {
    restaurant: { type: mongoose.Schema.Types.ObjectId, ref: 'Restaurant', required: true, index: true },
    name: { type: String, required: true },
    description: { type: String },
    price: { type: Number, required: true, min: 0 },
    category: { type: String, enum: ['starter','main','dessert','beverage','combo'], default: 'main' },
    isVeg: { type: Boolean, default: false, index: true },
    tags: [{ type: String }],
    image: { type: String },
    available: { type: Boolean, default: true },
  },
  { timestamps: true }
);

menuItemSchema.index({ restaurant: 1, isVeg: 1, price: 1 });

module.exports = mongoose.model('MenuItem', menuItemSchema);
