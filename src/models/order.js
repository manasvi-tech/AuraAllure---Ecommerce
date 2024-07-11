const mongoose = require("mongoose");
const Schema = mongoose.Schema;

const orderHistorySchema = new Schema({
    products:[
        {
            product:{
                type:Schema.Types.ObjectId,
                ref:"Product",
                required:[true,"Details of the products are required"]
            },
            quantity:{
                type:Number,
                required:[true,"quanitty of the product is required"]
            }
        }
    ],
    user:{
        type: Schema.Types.ObjectId,
        ref: "User",
        required: [true, "User is required"],
    },
    address:{
        type: Schema.Types.ObjectId,
        ref:"Address",
        required:[true,"Address is reuqired"]
    },
    amount:{
        type:Number,
        required:[true,"Amount is required"],
        default:0
    },
    date:{
        type:Date,
        default:Date.now()
    }
})

const OrderHistory = new mongoose.model("OrderHistory", orderHistorySchema);

module.exports = OrderHistory;