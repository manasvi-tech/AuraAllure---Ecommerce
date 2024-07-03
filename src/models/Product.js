const mongoose = require('mongoose');

const productSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true
  },
  id: {
    type: String,
    required: true
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
    type:String,
    required:true
  },
  price: {
    type: Number,
    required: true
  },
  originalPrice: {
    type: Number,
    required: false
  },
  underSale: {
    type: Boolean,
    required: false
  }
});

const Product = mongoose.model('Product', productSchema);

module.exports = Product;
