const mongoose = require('mongoose');

const productColorSchema = new mongoose.Schema({
  hex_value: {
    type: String,
    required: true
  },
  colour_name: {
    type: String,
    required: true
  }
});

const productSchema = new mongoose.Schema({
  id: {
    type: Number,
    required: true,
    unique: true
  },
  brand: {
    type: String,
    required: true
  },
  name: {
    type: String,
    required: true
  },
  price: {
    type: String,
    required: true
  },
  price_sign: {
    type: String,
    required: true
  },
  currency: {
    type: String,
    required: true
  },
  image_link: {
    type: String,
    required: true
  },
  product_link: {
    type: String,
    required: true
  },
  website_link: {
    type: String,
    required: true
  },
  description: {
    type: String,
    required: true
  },
  rating: {
    type: Number,
    default: null
  },
  category: {
    type: String,
    required: true
  },
  product_type: {
    type: String,
    required: true
  },
  tag_list: [{
    type: String
  }],
  created_at: {
    type: Date,
    required: true
  },
  updated_at: {
    type: Date,
    required: true
  },
  product_api_url: {
    type: String,
    required: true
  },
  api_featured_image: {
    type: String,
    required: true
  },
  product_colors: [productColorSchema]
});

const Product = mongoose.model('Product', productSchema);

module.exports = Product;
