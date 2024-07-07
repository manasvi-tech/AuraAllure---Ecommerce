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
const cookieParser = require('cookie-parser');
const jwt = require('jsonwebtoken');
require("./db/conn");
const Query = require("./models/query");
const User = require("./models/User");
const Address = require("./models/Address")
const methodOverride = require("method-override");
const { read } = require('fs');
app.use(methodOverride("_method"));
app.use(express.json());
app.use(cookieParser());
app.use(express.urlencoded({ extended: false })) // i want to get all the data of the form

const staticPath = path.join(__dirname, "../public");
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
        console.log(products);
        res.status(200).render('products', {
            products: products
        });
    } catch (err) {
        console.log(err);
    }
})

app.get('/productDetails/:id', async (req, res) => {
    try {
        const _id = req.params.id;
        const product = await Product.findOne({ _id: _id });

        if (!product) {
            res.status(404).send('Product not found')
        }

        const token = req.cookies.jwt;
        console.log(token);

        const verifyUser = jwt.verify(token, process.env.SECRET_KEY);

        const user = await User.findOne({ _id: verifyUser._id }) //getting the details of that user
        const isAdmin = user.isAdmin
        const email = user.email;

        res.render('productDetails', {
            product: product,
            isAdmin: isAdmin,
            email: email
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
            res.status(200).send("Registration successful!. Please login now");

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
    const user = req.user;
    const products = await Product.find({ _id: { $in: user.products } });
    res.render('cart', {
        products: products
    })

})

app.get('/buy/:id', auth, async (req, res) => {
    try {
        const user = req.user;
        const productId = req.params.id;
        const product = await Product.findOne({ _id: productId });

        if (!product || product.quantity == 0) {
            res.status(400).send('Product does not exist')
        } else {
            if (!user.products.includes(productId)) {
                user.products.push(productId);
            } else {
                return res.status(400).send('Product already added to cart');
            }
            // Save the updated user
            await user.save();
            const products = await Product.find({ _id: { $in: user.products } });
            res.render('cart', {
                products: products
            })
        }

    } catch (err) {
        res.status(400).send('account-details')
    }

})

app.get('/removeFromCart/:id', auth, async (req, res) => {
    try {
        const user = req.user;
        const itemid = req.params.id;

        const index = user.products.indexOf(itemid);
        if (index > -1) {
            user.products.splice(index, 1);
            console.log("product removed")
        }

        const result = await user.save();
        const products = await Product.find({ _id: { $in: user.products } });
        // console.log(products)

        res.render('cart', {
            products: products
        })


    } catch (err) {
        res.status(400).send(err)
    }
});

app.get('/moveToWishlist/:id', auth, async (req, res) => {
    try {
        const itemid = req.params.id;
        const user = req.user;
        const index = user.products.indexOf(itemid);
        console.log(index)
        if (index > -1) {
            user.products.splice(index, 1);
            console.log("product removed")
        }

        if (!user.wishList.includes(itemid)) {
            user.wishList.push(itemid);
        }
        const wishlist = await Product.find({ _id: { $in: user.wishList } });

        await user.save();
        res.status(200).render('wishlist', {
            products: wishlist
        })

    } catch (err) {
        res.status(400).send(err);
    }
})

// app.get('/checkout', auth, async (req, res) => {
//     try {
//         const user = req.user;
//         const = new Address({
//             firstname: req.body.firstname,
//             lastname: req.body.lastname,
//             email: req.body.email,
//             gender: req.body.gender,
//             password: req.body.password,
//             cpass: req.body.cpass,
//             isAdmin: false,
//             products: [],
//             orderHistory: [],
//             wishlist: []
//         });

//     } catch (err) {

//     }
// })

app.post('/checkout', auth, async(req,res)=>{
    try{
        console.log('checkout');
        const user = req.user;
        const amount = req.body.finalAmount;
        const address = await Address.find({_id : {$in: user.address}})
        console.log('address');
        res.render('checkout',{
            address:address
        })

    }catch(err){

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
            id: 982383,
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
            const products = await Product.find().limit(6);
            res.status(200).render('index', {
                products: products
            });
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

        const products = await Product.find().limit(6);
        res.render('index', {
            products: products
        })

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
        const products = await Product.find().limit(6);
        res.render('index', {
            products: products
        })
    } catch (err) {
        res.status(400).send(err);
    }

})



//wishlist functionalities

app.get('/wishlist', auth, async (req, res) => {
    try {
        const user = req.user;
        // const wishList = user.wishList;
        const wishListItems = await Product.find({ _id: { $in: user.wishList } });
        console.log(wishListItems);



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
        console.log(itemId)

        const product = await Product.findOne({ _id: itemId });

        if (!product || product.quantity == 0) {
            res.status(400).send('Product does not exist')
        }
        if (!user.wishList.includes(itemId)) {
            user.wishList.push(product._id);
            console.log("Pushed")
        }
        const wishListItems = await Product.find({ _id: { $in: user.wishList } });
        console.log(wishListItems)
        res.render('products', {
            products: wishListItems
        })

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

        const products = await Product.find({ _id: { $in: user.wishList } });
        res.render('wishlist', {
            products: products
        })
    } catch (err) {
        res.status(400).send(err);
    }

})

//address functionalities
app.get('/addressPage', auth, async (req, res) => {
    try {
        const user = req.user;
        const address = await Address.find({_id : {$in: user.address}})
        console.log(address);
        res.render('addressPage',{
            address:address
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
        console.log(itemId);

        if(!user.address.includes(itemId)){
            // console.log("Pushing the id")
            user.address.push(itemId);
            // console.log("pushed")
        }
        await user.save();
        
        res.render('account-details',{
            name:user.firstname
        });
    } catch (err) {
        res.status(500).send("An error occurred while saving the address");
    }
});



app.listen(port, () => {
    console.log('Connection established on port 3000');
})


