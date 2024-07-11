require('dotenv').config()
const express = require('express');
const app = express();
const { engine } = require('express-handlebars');
const port = process.env.PORT;
const path = require('path');
const hbs = require('hbs');
const bcrypt = require('bcrypt');
const auth = require('./middleware/auth')
const Product = require("./models/Product");
const Cart = require("./models/Cart");
const cookieParser = require('cookie-parser');
const jwt = require('jsonwebtoken');
const stripe = require('stripe').Stripe(process.env.STRIPE_PRIVATE_KEY)
require("./db/conn");
const Query = require("./models/query");
const OrderHistory = require("./models/order");
const User = require("./models/User");
const Address = require("./models/Address")
const methodOverride = require("method-override");  // DELETE AND UPDATE REQUEST CANT BE MADE DIRECTLY THUS THIS
const { read } = require('fs');

app.use(methodOverride("_method"));
app.use(express.json());
app.use(cookieParser());
app.use(express.urlencoded({ extended: false })) // i want to get all the data of the form

const staticPath = path.join(__dirname, "../public"); //CLIENT SIDE CODE IS HERE
const templatePath = path.join(__dirname, "../templates/views");
const partialsPath = path.join(__dirname, "../templates/partials");

app.use(express.static(staticPath));
app.engine('handlebars', engine());
app.set("view engine", "hbs");

app.set("views", templatePath);
hbs.registerPartials(partialsPath);

//Basic pages

app.get('/', async (req, res) => {
    const products = await Product.find().limit(6);
    // console.log(products);
    res.render('index', {
        products: products
    })
})

app.get('/account-details', auth, (req, res) => {
    const user = req.user;
    const firstname = user.firstname;
    const isAdmin = user.isAdmin
    res.render("account-details", {
        name: firstname,
        isAdmin: isAdmin
    });
})

app.get('/searchPage', async (req, res) => {
    try {
        const products = await Product.find().skip(6).limit(10);
        res.status(200).render('search', {
            products: products
        });

    } catch (err) {
        res.status(400).send(err);
    }

})


app.get('/products', auth, async (req, res) => {
    try {
        const products = await Product.find().skip(16).limit(14);
        // console.log(products);
        res.status(200).render('products', {
            products: products
        });
    } catch (err) {
        console.log(err);
    }
})

app.get('/productDetails/:id', auth, async (req, res) => {
    try {
        console.log('in productDetails')
        const _id = req.params.id;
        console.log(_id)
        const product = await Product.findOne({ _id: _id });
        const user = req.user;

        const isAdmin = user.isAdmin

        console.log(product);

        res.render('productDetails', {
            product: product,
            isAdmin: isAdmin,
        })
    } catch (err) {
        res.status(400).send(err);
    }
})

//query post

app.post('/query', async (req, res) => {
    try {
        const registerQuery = new Query({
            name: req.body.name,
            email: req.body.email,
            query: req.body.query
        })

        const querySent = await registerQuery.save();
        res.send(querySent);
    } catch (err) {
        res.status(400).send(err);
    }
})

//login and register functionalities

app.post('/register', async (req, res) => {
    try {
        const registerUser = new User({
            firstname: req.body.firstname,
            lastname: req.body.lastname,
            email: req.body.email,
            gender: req.body.gender,
            password: req.body.password,
            cpass: req.body.cpass,
            isAdmin: false,
            products: [],
            orderHistory: [],
            wishlist: []
        });

        const exists = await User.findOne({ email: req.body.email });

        if (exists) {
            res.status(400).send("You already have an account. Please login.");
        } else if (req.body.cpass !== req.body.password) {
            res.status(400).send("Password and confirm password do not match.");
        } else {
            const token = await registerUser.generateToken();
            res.cookie("jwt", token);

            console.log(token);
            const registered = await registerUser.save();
            
            res.redirect('/register');

        }

    } catch (err) {
        console.log("Error fetching details");
        res.status(400).send("There is an error: " + err);
    }
});


app.post('/log-in', async (req, res) => {

    try {
        const email = req.body.email
        const password = req.body.password

        const userEmail = await User.findOne({ email: email });
        // console.log(userEmail);
        // res.send(userEmail);

        const isMatch = await bcrypt.compare(password, userEmail.password)

        console.log(isMatch);

        const token = await userEmail.generateToken();
        console.log(token);



        const expirationDate = new Date();
        //browser will remember the user for 5 days after login
        expirationDate.setDate(expirationDate.getDate() + 5); // Set the expiration date to 7 days from now
        res.cookie("jwt", token, { expires: expirationDate, httpOnly: true, secure: true });

        console.log("cookie made");
        const products = await Product.find().limit(6);

        if (isMatch) {
            res.status(201).render("index", {
                products: products
            });
        } else {
            res.send("Invalid details");
        }


    } catch (err) {
        res.send("In try and catch block " + err);
    }
})



app.get('/logout', auth, async (req, res) => {
    try {
        console.log(req.user);
        res.clearCookie("jwt");
        console.log("logout succesful")
        await req.user.save();
        res.render('register')
    } catch (err) {
        res.status(500).send(err)
    }
})


//cart functionalities

app.get('/cart', auth, async (req, res) => {
    try {
        const user = req.user;

        const cartProducts = await Cart.find({ user: user._id }).populate('product')

        const productsWithQuantity = cartProducts.map(cartItem => ({
            product: cartItem.product,
            quantity: cartItem.quantity
        }));

        res.render('cart', {
            products: productsWithQuantity
        });

    } catch (err) {
        res.status(400).send(err);
    }

})

app.post('/buy/:id', auth, async (req, res) => {
    try {
        const user = req.user;
        const productId = req.params.id;
        const quantity = req.body.quantity;

        if (!user.products.includes(productId)) {

            user.products.push(productId);

            const registerCart = new Cart({
                product: productId,
                quantity: quantity,
                user: user._id
            })
            await registerCart.save();
            await user.save();

        }

        res.redirect('/cart')

    } catch (err) {
        res.status(400).send('account-details')
    }
})

app.get('/removeFromCart/:id', auth, async (req, res) => {
    try {
        const user = req.user;
        const itemid = req.params.id;
        console.log("removing from cart")
        const product = await Cart.findOne({ product: itemid });

        if (product) {
            const deletedProduct = await Cart.findOneAndDelete({ _id: product._id });
            console.log("Product removed:");
        } else {
            console.log("Product not found");
        }

        const index = user.products.indexOf(itemid);
        if (index > -1) {
            user.products.splice(index, 1);
            console.log("product removed")
        }
        await user.save();

        res.redirect('/cart');

    } catch (err) {
        res.status(400).send(err)
    }
});

app.get('/increaseProduct/:id', auth, async (req, res) => {
    try {
        const user = req.user;
        const itemId = req.params.id;
        const product = await Cart.findOne({ product: itemId });
        product.quantity = Number(product.quantity) + Number(1);
        await product.save();
        console.log("added");

        res.redirect('/cart');

    } catch (err) {
        res.status(400).send(err);
    }



})
app.get('/decreaseProduct/:id', auth, async (req, res) => {
    try {
        const user = req.user;
        const itemId = req.params.id;
        const product = await Cart.findOne({ product: itemId });
        product.quantity = Number(product.quantity) - Number(1);
        await product.save()
        console.log("added");

        res.redirect('/cart');
    } catch (err) {
        res.status(400).send(err);
    }

})

app.post('/checkout', auth, async (req, res) => {
    try {
        console.log('checkout');
        const user = req.user;
        const amount = req.body.finalAmount;
        const address = await Address.find({ _id: { $in: user.address } })
        // console.log('address');
        res.render('checkout', {
            address: address,
            amount: amount
        })

    } catch (err) {

    }
})



//admin functionalities

app.get('/newProductAdmin', async (req, res) => {
    try {
        res.render('newProductAdmin')
    } catch (err) {
        res.status(400).send(err)
    }
})


app.post('/newProduct', async (req, res) => {

    try {
        const registerProduct = new Product({
            id: req.body.id,
            name: req.body.name,
            price: req.body.price,
            originalPrice: req.body.org_price,
            rating: req.body.rating,
            brand: req.body.brand,
            imageUrl: req.body.imageUrl,
            quantity: req.body.quantity,
            underSale: req.body.onSale,
            description: req.body.description
        })
        const exists = await User.findOne({ name: req.body.name });
        if (exists) {
            res.status(400).send("Product already exists");
        } else {
            const added = await registerProduct.save();
            console.log("Product added")
            res.redirect('/');
        }

    } catch (err) {
        res.status(400).send("couldnt add object " + err);
    }
})

app.get('/editAdmin/:id', async (req, res) => {
    try {
        // console.log("here")
        const _id = req.params.id;
        const product = await Product.findOne({ _id: _id });

        if (!product) {
            res.status(404).send('Product not found')
        }

        res.render('editAdmin', {
            product: product
        })
    } catch (err) {
        res.status(400).send(err);
    }


})

app.post('/editItem/:id', async (req, res) => {
    const newQuantity = req.body.quantity;
    const itemId = req.params.id;

    try {
        const result = await Product.updateOne({ id: itemId }, {
            $set: {
                quantity: newQuantity
            }
        });
        if (result.nModified === 0) {
            console.log("Product not found or quantity unchanged");
        } else {
            console.log("Product updated successfully");
        }

        res.redirect('/');

    } catch (err) {
        res.status(400).send(err);
    }
});

app.get('/deleteAdmin/:id', async (req, res) => {
    try {
        // console.log("here")
        const _id = req.params.id;
        const product = await Product.findOne({ _id: _id });

        if (!product) {
            res.status(404).send('Product not found')
        }

        res.render('deleteAdmin', {
            product: product
        })
    } catch (err) {
        res.status(400).send(err);
    }

});

app.delete('/deleteItem/:id', async (req, res) => {
    try {
        const itemId = req.params.id;
        const result = await Product.findByIdAndDelete(itemId)
        if (!result) console.log("product isnt found");
        
        res.redirect('/');

    } catch (err) {
        res.status(400).send(err);
    }

})

app.get('/deleteUserAdmin', (req, res) => {
    res.status(200).render('deleteUserAdmin');
})

app.post('/deleteUserAdmin', async (req, res) => {
    try {
        const email = req.body.email;
        const user = await User.findOne({
            email: email
        })

        if (!user) console.log("user not found")

        else {
            // console.log(user);
            res.render('deleteUserAdmin', {
                user: user
            })
        }
    } catch (err) {
        res.status(400).send(err)
    }

})

app.delete('/deleteUserAdmin/:id', async (req, res) => {
    try {
        const userId = req.params.id;
        const result = await User.findByIdAndDelete(itemId);
        if (!result) console.log("user wasnt found")

        res.redirect('/');

    } catch (err) {
        res.status(400).send(err);
    }
})

//wishlist functionalities

app.get('/wishlist', auth, async (req, res) => {
    try {
        const user = req.user;
        const wishListItems = await Product.find({ _id: { $in: user.wishList } });

        res.render('wishlist', {
            products: wishListItems
        })
    }
    catch (err) {
        res.status(400).send(err);
    }
})

app.get('/addProductWish/:id', auth, async (req, res) => {
    try {
        const user = req.user;
        const itemId = req.params.id;
        // console.log(itemId)

        const product = await Product.findOne({ _id: itemId });

        if (!product || product.quantity == 0) {
            res.status(400).send('Product does not exist')
        }
        if (!user.wishList.includes(itemId)) {
            user.wishList.push(product._id);
            console.log("Pushed")
        }
        res.redirect('/wishlist');

        await user.save();

    } catch (err) {
        res.status(400).send(err);
    }
})

app.get('/removeFromWishlist/:id', auth, async (req, res) => {
    try {
        const user = req.user;
        const itemid = req.params.id;

        const index = user.wishList.indexOf(itemid);
        if (index > -1) {
            user.wishList.splice(index, 1);
            console.log("product removed")
        }
        await user.save();

        res.redirect('/wishlist');

    } catch (err) {
        res.status(400).send(err);
    }

})

//address functionalities
app.get('/addressPage', auth, async (req, res) => {
    try {
        const user = req.user;
        const address = await Address.find({ _id: { $in: user.address } })
        // console.log(address);
        res.render('addressPage', {
            address: address
        })
    } catch (err) {
        res.status(400).send(err);
    }
})


app.get('/addAddress', auth, async (req, res) => {
    try {
        res.render('addAddress')
    } catch (err) {
        res.status(400).send(err)
    }
})

app.post('/addAddress', auth, async (req, res) => {
    try {
        // console.log("In address page")
        const user = req.user;
        const registerAddress = new Address({
            fullname: req.body.fullname,
            mnumber: req.body.mnumber,
            pincode: req.body.pincode,
            flat: req.body.flat,
            area: req.body.area,
            city: req.body.city
        });
        // console.log(user);

        const registered = await registerAddress.save();
        const itemId = registered._id;
        // console.log(itemId);

        if (!user.address.includes(itemId)) {
            // console.log("Pushing the id")
            user.address.push(itemId);
            // console.log("pushed")
        }
        await user.save();
        
        res.redirect('/addressPage');

    } catch (err) {
        res.status(500).send("An error occurred while saving the address");
    }
});

app.delete('/deleteAddress/:id', auth, async (req, res) => {
    try {
        const itemId = req.params.id;
        const user = req.user;
        const result = await Address.findByIdAndDelete(itemId);
        if (!result)
            console.log("address not found")

        const index = user.address.indexOf(itemId);
        if (index > -1) {
            user.address.splice(index, 1);
            console.log("product removed")
        }

        res.redirect('/addressPage');

    } catch (err) {
        res.status(400).send(err);
    }
})

//search functionalities

app.get('/productSearch', async (req, res) => {
    const search = req.query.q;
    // console.log(search);
    try {
        const products = await Product.find({ name: { $regex: search, $options: 'i' } });
        const brands = [...new Set(products.map(product => product.brand))]

        res.render('products', {
            products: products,
            brands: brands,
            searchedItem: search
        })

    } catch (err) {
        res.status(400).render(err);
    }
})

app.post('/filters/:item', async (req, res) => {
    const search = req.params.item; // Access route parameter
    const brands = req.body.brands || [];
    const minPrice = req.body.minPrice;
    const maxPrice = req.body.maxPrice;

    let products = await Product.find({ name: { $regex: search, $options: 'i' } });

    if (brands.length > 0) {
        products = products.filter(product => brands.includes(product.brand));
    }

    if (minPrice && !isNaN(parseFloat(minPrice))) {
        products = products.filter(product => product.price >= parseFloat(minPrice));
    }

    if (maxPrice && !isNaN(parseFloat(maxPrice))) {
        products = products.filter(product => product.price <= parseFloat(maxPrice));
    }

    // Process form data and implement filtering logic here
    res.status(400).render('products', {
        products: products,
        brands: brands,
        searchedItem: search
    })
});


//payment and order history

app.get('/payment/:id', auth, async (req, res) => {
    try {
        const addressId = req.params.id;
        const amount = req.query.amount;
        const address = await Address.findOne({ _id: addressId });
        const user = req.user;

        const cartProducts = await Cart.find({ user: user._id }).populate('product')

        const productsWithQuantity = cartProducts.map(cartItem => ({
            product: cartItem.product,
            quantity: cartItem.quantity
        }));

        res.render('payment', {
            amount: amount,
            address: address,
            products: productsWithQuantity
        })

    } catch (err) {
        res.status(400).send(err);
    }

})

app.post('/payment', auth, async (req, res) => {
    try {
        const user = req.user;
        const amount = req.query.amount;
        const address = req.body;

        const registerAddress = new Address({
            fullname: address.fullname,
            mnumber: address.mnumber,
            pincode: address.pincode,
            flat: address.flat,
            area: address.area,
            city: address.city
        });

        console.log("made");

        const savedAddress = await registerAddress.save();
        console.log(savedAddress);

        // async function productWithQuantity(cartItem) {
        //     let obj = {
        //         product: await Product.findOne({ _id: cartItem.product }).select('name'),
        //         quantity: cartItem.quantity
        //     };
        //     return obj;
        // }

        // const cartProducts = await Cart.find({ user: user._id });
        // const productsWithQuantity = [];

        // for (const cartItem of cartProducts) {
        //     const product = await productWithQuantity(cartItem);
        //     productsWithQuantity.push(product);
        // }

        const cartProducts = await Cart.find({ user: user._id }).populate('product')

        const productsWithQuantity = cartProducts.map(cartItem => ({
            product: cartItem.product,
            quantity: cartItem.quantity
        }));

        res.render('payment', {
            amount: amount,
            address: savedAddress, // Pass address as an object
            products: productsWithQuantity
        });

    } catch (err) {
        res.status(400).send(err);
    }
});

app.get('/proceedToPay/:id', auth, async (req, res) => {
    try {
        const user = req.user;
        const amount = req.query.amount;
        const addressid = req.params.id;

        const address = await Address.findOne({ _id: addressid });

        const cartProducts = await Cart.find({ user: user._id }).populate('product');

        const productsWithQuantity = cartProducts.map(cartItem => ({
            product: cartItem.product,
            quantity: cartItem.quantity
        }));

        const registerOrder = new OrderHistory({
            products: productsWithQuantity,
            user: user._id,
            address: address._id,
            amount: amount,
            date: Date.now()
        })

        await registerOrder.save();
        console.log("saved address")
        const deleteCart = await Cart.deleteMany({ user: user._id });

        if (!user.orderHistory.includes()) {
            user.orderHistory.push(registerOrder._id);
            console.log("Done")
        }

        const products = await Product.find().limit(6);
        // console.log(products);
        res.render('index', {
            products: products
        })


    } catch (err) {
        res.status(400).send(err)
    }
})

app.get('/orderHistory', auth, async (req, res) => {
    const user = req.user;
    const orders = user.orderHistory;
    console.log("Starting")

    const orderedProducts = await OrderHistory.find({ user: user._id }).populate({
        path: 'products.product'
    }).populate('address');
    // console.log(orderedProducts);

    res.render('orderHistory', {
        orders: orderedProducts,
        username: user.firstname
    })
})

app.listen(port, () => {
    console.log('Connection established on port 3000');
})


