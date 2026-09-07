const mongoose = require('mongoose');
const dotenv = require('dotenv');

dotenv.config();

const connectDB = require('./config/db');
const Restaurant = require('./models/restaurantModel');
const User = require('./models/userModel');
const MenuItem = require('./models/menuItemModel');
const CateringPackage = require('./models/cateringPackageModel');
const Order = require('./models/orderModel');

const daysFromNow = (days) => {
  const date = new Date();
  date.setDate(date.getDate() + days);
  date.setHours(12, 0, 0, 0);
  return date;
};

const seed = async () => {
  await connectDB();

  await Promise.all([
    Order.deleteMany({}),
    CateringPackage.deleteMany({}),
    MenuItem.deleteMany({}),
    User.deleteMany({}),
    Restaurant.deleteMany({}),
  ]);

  const [spice, royal] = await Restaurant.create([
    {
      name: 'Spice Paradise',
      description: 'Authentic vegetarian catering - South & North Indian specials',
      address: 'MG Road, Bangalore, Karnataka',
      phone: '9876543210',
      cuisine: 'Vegetarian, South Indian',
    },
    {
      name: 'Royal Feast',
      description: 'Premium multi-cuisine catering with veg & non-veg options',
      address: 'Connaught Place, New Delhi',
      phone: '9123456789',
      cuisine: 'Mughlai, Chinese, Continental',
    },
  ]);

  const users = [
    { name: 'Spice Admin', email: 'admin@spiceparadise.com', password: '123456', restaurant: spice._id, role: 'admin' },
    { name: 'Spice Staff', email: 'staff@spiceparadise.com', password: '123456', restaurant: spice._id, role: 'staff' },
    { name: 'Royal Admin', email: 'admin@royalfeast.com', password: '123456', restaurant: royal._id, role: 'admin' },
    { name: 'Royal Staff', email: 'staff@royalfeast.com', password: '123456', restaurant: royal._id, role: 'staff' },
  ];
  const [spiceAdmin, , royalAdmin] = await Promise.all(users.map((u) => User.create(u)));

  const spiceItems = await MenuItem.insertMany([
    { restaurant: spice._id, name: 'Paneer Tikka', description: 'Grilled cottage cheese with peppers', price: 280, category: 'starter', isVeg: true, tags: ['paneer', 'vegetarian'] },
    { restaurant: spice._id, name: 'Veg Biryani', description: 'Aromatic basmati rice with seasonal vegetables', price: 320, category: 'main', isVeg: true, tags: ['rice', 'biryani'] },
    { restaurant: spice._id, name: 'Dal Makhani', description: 'Slow-cooked creamy black lentils', price: 250, category: 'main', isVeg: true, tags: ['dal'] },
    { restaurant: spice._id, name: 'Gulab Jamun', description: 'Sweet milk dumplings in rose syrup', price: 120, category: 'dessert', isVeg: true, tags: ['sweet'] },
    { restaurant: spice._id, name: 'Masala Dosa', description: 'Crispy dosa with spiced potato filling', price: 180, category: 'main', isVeg: true, tags: ['south indian'] },
    { restaurant: spice._id, name: 'Filter Coffee', description: 'Traditional South Indian filter coffee', price: 60, category: 'beverage', isVeg: true, tags: ['coffee'] },
  ]);

  const royalItems = await MenuItem.insertMany([
    { restaurant: royal._id, name: 'Chicken Biryani', description: 'Hyderabadi dum-cooked chicken biryani', price: 450, category: 'main', isVeg: false, tags: ['chicken', 'biryani'] },
    { restaurant: royal._id, name: 'Butter Chicken', description: 'Creamy tomato and butter gravy', price: 480, category: 'main', isVeg: false, tags: ['chicken'] },
    { restaurant: royal._id, name: 'Veg Pulao', description: 'Mildly spiced vegetable pulao', price: 300, category: 'main', isVeg: true, tags: ['rice', 'vegetarian'] },
    { restaurant: royal._id, name: 'Fish Tikka', description: 'Char-grilled marinated fish', price: 520, category: 'starter', isVeg: false, tags: ['fish'] },
    { restaurant: royal._id, name: 'Paneer Butter Masala', description: 'Paneer simmered in buttery gravy', price: 350, category: 'main', isVeg: true, tags: ['paneer'] },
    { restaurant: royal._id, name: 'Phirni', description: 'Chilled rice pudding with saffron', price: 150, category: 'dessert', isVeg: true, tags: ['sweet'] },
  ]);

  const packages = await CateringPackage.insertMany([
    {
      restaurant: spice._id,
      name: 'Veg Delight - Economy',
      description: 'Budget vegetarian package for small gatherings',
      items: [spiceItems[0]._id, spiceItems[1]._id, spiceItems[3]._id],
      pricePerPerson: 450,
      minGuests: 10,
      maxGuests: 50,
      isVeg: true,
      tags: ['vegetarian', 'economy', 'birthday'],
    },
    {
      restaurant: spice._id,
      name: 'Spice Grand Feast',
      description: 'Premium vegetarian full-course spread',
      items: spiceItems.map((i) => i._id),
      pricePerPerson: 650,
      minGuests: 20,
      maxGuests: 200,
      isVeg: true,
      tags: ['vegetarian', 'premium', 'south indian', 'wedding'],
    },
    {
      restaurant: royal._id,
      name: 'Royal Non-Veg Extravaganza',
      description: 'Lavish chicken and fish spread',
      items: royalItems.map((i) => i._id),
      pricePerPerson: 850,
      minGuests: 20,
      maxGuests: 300,
      isVeg: false,
      tags: ['non-veg', 'premium', 'wedding'],
    },
    {
      restaurant: royal._id,
      name: 'Royal Veg Classic',
      description: 'Vegetarian selection from the Royal Feast kitchen',
      items: [royalItems[2]._id, royalItems[4]._id, royalItems[5]._id],
      pricePerPerson: 550,
      minGuests: 15,
      maxGuests: 100,
      isVeg: true,
      tags: ['vegetarian', 'classic'],
    },
    {
      restaurant: royal._id,
      name: 'Budget Non-Veg Combo',
      description: 'Affordable chicken biryani combo',
      items: [royalItems[0]._id, royalItems[4]._id],
      pricePerPerson: 600,
      minGuests: 10,
      maxGuests: 80,
      isVeg: false,
      tags: ['non-veg', 'budget', 'corporate'],
    },
  ]);

  const vegEconomy = packages.find((p) => p.name === 'Veg Delight - Economy');
  const royalCombo = packages.find((p) => p.name === 'Budget Non-Veg Combo');

  await Order.insertMany([
    {
      restaurant: spice._id,
      customerName: 'Anita Rao',
      customerPhone: '9845012345',
      customerEmail: 'anita.rao@example.com',
      cateringPackage: vegEconomy._id,
      guestCount: 30,
      eventDate: daysFromNow(14),
      totalPrice: vegEconomy.pricePerPerson * 30,
      status: 'confirmed',
      specialRequests: 'Less spicy, please.',
      createdBy: spiceAdmin._id,
    },
    {
      restaurant: royal._id,
      customerName: 'Vikram Malhotra',
      customerPhone: '9811122233',
      customerEmail: 'vikram.m@example.com',
      cateringPackage: royalCombo._id,
      guestCount: 45,
      eventDate: daysFromNow(21),
      totalPrice: royalCombo.pricePerPerson * 45,
      status: 'pending',
      specialRequests: 'Setup by 6pm.',
      createdBy: royalAdmin._id,
    },
  ]);

  await mongoose.disconnect();
  process.exit(0);
};

seed().catch(async (err) => {
  await mongoose.disconnect().catch(() => {});
  process.exit(1);
});
