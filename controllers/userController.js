const User = require('../models/userModel')
const HttpError = require('../models/errorModel')


const bcrypt = require('bcryptjs')  // This is used to Hash the Password For this bcryptjs need to be imported 
const jwt = require('jsonwebtoken')
const fs = require('fs') //fileSystem
const path = require('path')
const { v4: uuid } = require("uuid")




//  REGISTER A NEW USER
// POST :api/users/register
// UNPROTECTED
const registerUser = async (req, res, next) => {
    try {
        const { name, email, password, password2 } = req.body;
        if (!name || !email || !password) {
            return next(new HttpError("Fill all fields!", 422))
        }
        if(!password2){
            return next(new HttpError("Enter Confirm password!", 422))
        }
        const newEmail = email.toLowerCase()

        const emailExists = await User.findOne({ email: newEmail })

        if (emailExists) {
            return next(new HttpError("Email Already Exists!", 422))
        }

        if ((password.trim()).length < 6) {
            return next(new HttpError("Password Should be atleast 6 Characters!", 422))
        }

        if (password != password2) {
            return next(new HttpError("Password do not Match!", 422))
        }

        // encypted password
        const salt = await bcrypt.genSalt(10)
        const hashedPass = await bcrypt.hash(password, salt);

        const newUser = await User.create({ name, email: newEmail, password: hashedPass })

        res.status(200).json(`New User ${newUser.email} Registered`)
    } catch (err) {
        return next(new HttpError("User Registration Failed!", 422))
    }
}




//  LOGIN A REGISTER USER
// POST :api/users/login
// UNPROTECTED
const loginUser = async (req, res, next) => {

    try {
        const { email, password } = req.body
        if (!email || !password) {
            return next(new HttpError("Fill all the Fields", 422))
        }
        const newEmail = email.toLowerCase();
        const user = await User.findOne({ email: newEmail })

        if (!user) {
            return next(new HttpError("Invalid User credentials", 422))

        }
        const comparePassword = await bcrypt.compare(password, user.password)
        if (!comparePassword) {
            return next(new HttpError("Invalid Password credentials", 422))
        }

        const { _id: id, name } = user;
        const token = jwt.sign({ id, name }, process.env.JWT_SECRET, { expiresIn: "1d" })

        res.status(200).json({ token, id, name })
    } catch {
        return next(new HttpError("Login failed Please check your credentials!", 422))
    }
}





//  USER PROFILE
// GET :api/users/:id
// PROTECTED
const getUser = async (req, res, next) => {
    try {
        const { id } = req.params;
        const user = await User.findById(id).select(`-password`);
        if (!user) {
            return next(new HttpError("Use Not Found", 404))
        }
        res.status(200).json(user);
    } catch (error) {
        return next(new HttpError(error))
    }
}




// GET AUTHORS
// GET :api/users/authors
// UNPROTECTED
const getAuthors = async (req, res, next) => {
    try {
        const authors = await User.find().select(`-password`);
        res.status(200).json(authors)
    } catch (error) {
        return next(new HttpError(error))
    }
}



//  CHANGE USER AVATAR(PROFILE PHOTO)
// POST :api/users/change-avatar
// PROTECTED
const changeAvatar = async (req, res, next) => {
    try {
        if (!req.files.avatar) {
            return next(new HttpError("Please choose the image", 422))
        }
        // Find user from the database
        const user = await User.findById(req.user.id);

        // Delete old avatar if there exits
        if (user.avatar) {
            fs.unlink(path.join(__dirname, "..", 'uploads', user.avatar), (error) => {  //unlink is the method to delete the files
                if (error) {
                    return next(new HttpError(error))
                }
            })
        }
        const { avatar } = req.files;

        if (avatar.size > 500000) {
            return next(new HttpError("Profile Picture is to big ,It Should be less than 500kb"))
        }

        let fileName;
        fileName = avatar.name;
        let splittedFileName = fileName.split('.')
        let newFileName = splittedFileName[0] + uuid() + '.' + splittedFileName[splittedFileName.length - 1]

        // Add the new Avatar
        avatar.mv(path.join(__dirname, '..', 'uploads', newFileName), async (error) => {
            if (error) {
                return next(new HttpError(error))
            }
            const updatedAvatar = await User.findByIdAndUpdate(req.user.id, { avatar: newFileName }, { new: true })
            if (!updatedAvatar) {
                return next(new HttpError("Avatar Can't be Updated"));
            }
            res.status(200).json(updatedAvatar)
        })
    } catch (error) {
        return next(new HttpError(error))
    }
}


//  EDIT USER DETAILS (from Profile)
// POST :api/users/edit-user
// PROTECTED
const editUser = async (req, res, next) => {

    try {
        const { name, email, currentPassword, newPassword, confirmNewPassword } = req.body;
        if (!name || !email || !currentPassword || !newPassword) {
            return next(new HttpError("Fill all the Fields", 422))
        }
        // Get user from the database
        const user = await User.findById(req.user.id);
        if (!user) {
            return next(new HttpError("User not found", 403))
        }

        // make sure the new email doesn't already exits
        const emailExist=await User.findOne({email})
        if(emailExist && (emailExist._id !=req.user.id)){
            return next(new HttpError("Email Already Exists", 422))
        }

        // compare current password to the DB password
        const validateUserPassword=await bcrypt.compare(currentPassword,user.password)

        if(!validateUserPassword){
            return next(new HttpError("Invalid Current password", 422))
        }

        // compare new password
        if(newPassword!=confirmNewPassword){
            return next(new HttpError("New Passwords Does not match", 422))
        }
        // New hash password
        const salt=await bcrypt.genSalt(10);
        const hashPassword=await bcrypt.hash(newPassword,salt)

        // update user info in the Database
        const updateInfo=await User.findByIdAndUpdate(req.user.id,{name,email,password:hashPassword},{new:true})

        res.status(200).json(updateInfo);
    } catch (error) {
        return next(new HttpError(error))
    }
}


module.exports = { registerUser, loginUser, getUser, changeAvatar, editUser, getAuthors }