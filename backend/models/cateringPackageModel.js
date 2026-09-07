const mongoose = require('mongoose');

const cateringPackageSchema = mongoose.Schema(
  {
    restaurant: { type: mongoose.Schema.Types.ObjectId, ref: 'Restaurant', required: true, index: true },
    name: { type: String, required: true },
    description: { type: String },
    items: [{ type: mongoose.Schema.Types.ObjectId, ref: 'MenuItem' }],
    pricePerPerson: { type: Number, required: true, min: 0 },
    minGuests: { type: Number, default: 10 },
    maxGuests: { type: Number, default: 500 },
    isVeg: { type: Boolean, default: false, index: true },
    tags: [{ type: String }],
    image: { type: String },
    available: { type: Boolean, default: true },
  },
  { timestamps: true }
);

cateringPackageSchema.index({ restaurant: 1, isVeg: 1, pricePerPerson: 1 });

module.exports = mongoose.model('CateringPackage', cateringPackageSchema);
