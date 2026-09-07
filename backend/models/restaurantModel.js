const mongoose = require('mongoose');

const restaurantSchema = mongoose.Schema(
  {
    name: { type: String, required: true },
    description: { type: String },
    address: { type: String, required: true },
    phone: { type: String },
    cuisine: { type: String },
    image: { type: String },
  },
  { timestamps: true }
);

module.exports = mongoose.model('Restaurant', restaurantSchema);
