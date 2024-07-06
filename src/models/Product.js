const mongoose = require('mongoose');

const productSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true,"Name of the product is required"]
  },
  id: {
    type: String,
    required: [true,"Email of the product is required"]
  },
  rating: {
    type: Number,
    required: false
  },
  description: {
    type: String,
    required: false,
    default: "No description"
  },
  imageUrl: {
    type: String,
    required: [true,"imageUrl is required"]
  },
  price: {
    type: Number,
    required: [true,"price is required"]
  },
  originalPrice: {
    type: Number,
    required: [true,"original price is required"]
  },
  underSale: {
    type: Boolean,
    required: false
  },
  brand: {
    type: String,
    required: [true,"brand is required"]
  },
  categories: {
    type: [String],
    required: false
  },
  colours: {
    type: [{
      name: String,
      hexValue: String
    }],
    required: false
  },
  quantity:{
    type:Number,
    required:[true,"Quantity is required"]
  }
});

const Product = mongoose.model('Product', productSchema);

module.exports = Product;
