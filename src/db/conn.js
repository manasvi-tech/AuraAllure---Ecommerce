const mongoose = require('mongoose');


// Replace <username>, <password>, and <your-cluster-url> with your actual credentials and cluster URL
const mongoDBConnectionString = `mongodb+srv://manasviarora28:${process.env.MONGO_PASS}@cluster0.efnn1fm.mongodb.net/AuraAllure?retryWrites=true&w=majority&appName=Cluster0`;

mongoose.connect(mongoDBConnectionString, { useNewUrlParser: true, useUnifiedTopology: true })
  .then(() => console.log('MongoDB connected'))
  .catch(err => console.error('MongoDB connection error:', err));


// mongoose.connect(`mongodb://127.0.0.1:27017/${process.env.DB_NAME}`).then(()=>{ //registration-tut is the name of the database
//     console.log("mongoose connection succesful");
// }).catch((err)=>{
//     console.log(err);
// })
