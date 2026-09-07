const mongoose = require('mongoose');

const orderSchema = mongoose.Schema(
  {
    restaurant: { type: mongoose.Schema.Types.ObjectId, ref: 'Restaurant', required: true, index: true },
    customerName: { type: String, required: true },
    customerPhone: { type: String },
    customerEmail: { type: String },
    cateringPackage: { type: mongoose.Schema.Types.ObjectId, ref: 'CateringPackage', required: true },
    guestCount: { type: Number, required: true, min: 1 },
    eventDate: { type: Date, required: true },
    totalPrice: { type: Number, required: true, min: 0 },
    status: { type: String, enum: ['pending','confirmed','preparing','delivered','cancelled'], default: 'pending' },
    specialRequests: { type: String },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  },
  { timestamps: true }
);

module.exports = mongoose.model('Order', orderSchema);
