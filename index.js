const express = require('express');
const cors = require('cors');
const { connect } = require('mongoose');
require('dotenv').config();
const upload=require('express-fileupload') //installed the fileupload by terminal by this we can view the uploaded image in the terminal for testin g purpose

const userRoutes =require('./routes/userRoutes.js')
const postRoutes =require('./routes/postRoutes.js');
const { notFound,errorHandler } = require('./middleware/errorMiddleware.js');

const app = express();

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cors({
    credentials: true,
    origin: ["http://localhost:3000", "https://chipper-biscotti-9597be.netlify.app"] // Add your Netlify app here
}));
app.use(upload());
app.use('/uploads',express.static(__dirname+'/uploads'))

app.use('/api/users', userRoutes);
app.use('/api/posts', postRoutes);

// To Handle the Error 
app.use(notFound)
app.use(errorHandler)

connect(process.env.MONGO_URI).then(app.listen(process.env.PORT || 5000,()=>console.log(`Server is Running on port ${process.env.PORT}`))).catch(er=>{console.log(er)});
