const Post = require('../models/postModel')
const User = require('../models/userModel')
const path = require('path')
const fs = require('fs')
const { v4: uuid } = require('uuid')
const HttpError = require('../models/errorModel')




// Create a post
// POST:api/posts
// PROTECTED
const createPost = async (req, res, next) => {
    try {
        let { title, description, category } = req.body;
        if (!title || !description || !category || !req.files || !req.files.thumbnail) {
            return next(new HttpError("Fill in all fields and choose a thumbnail!", 422));
        }

        const { thumbnail } = req.files;

        // Check the file size
        if (thumbnail.size > 2000000) {
            return next(new HttpError("Thumbnail too big! File should be less than 2MB.", 422));
        }

        const fileName = thumbnail.name;
        const splittedFileName = fileName.split('.');
        const newFileName = `${splittedFileName[0]}_${uuid()}.${splittedFileName[splittedFileName.length - 1]}`;

        // Move the file
        await thumbnail.mv(path.join(__dirname, '..', 'uploads', newFileName));

        const newPost = await Post.create({
            title,
            category,
            description,
            thumbnail: newFileName,
            creator: req.user.id
        });

        if (!newPost) {
            return next(new HttpError("Post couldn't be created.", 422));
        }

        // Update user's post count
        const currentUser = await User.findById(req.user.id);
        const userPostCount = currentUser.posts + 1;
        await User.findByIdAndUpdate(req.user.id, { posts: userPostCount });

        res.status(201).json(newPost);
    } catch (error) {
        return next(new HttpError(error.message, 500));
    }
};




// Get All Posts
// GET:api/posts
// UNPROTECTED
const getPosts = async (req, res, next) => {
    try {
        const posts = await Post.find().sort({ updatedAt: -1 })
        res.status(200).json(posts)
    } catch (error) {
        return next(new HttpError(error))
    }
}




// Get Single Post
// GET:api/posts/:id
// UNPROTECTED
const getPost = async (req, res, next) => {
    try {
        const postId = req.params.id;
        const post = await Post.findById(postId)
        if (!post) {
            return next(new HttpError("Post not found", 404))
        }
        res.status(200).json(post)
    } catch (error) {
        return next(new HttpError(error))
    }

}


// GET POST BY CATEGORY
// GET:api/posts/categories/:category
// UNPROTECTED
const getCatPosts = async (req, res, next) => {
    try {
        const { category } = req.params
        const categoryPost = await Post.find({ category }).sort({ createdAt: -1 })
        res.status(200).json(categoryPost)
    } catch (error) {
        return next(new HttpError(error))
    }
}


// GET USER/AUTHOR POST
// Get:api/posts/users/:id
// PROTECTED
const getUserPosts = async (req, res, next) => {
    try {
        const { id } = req.params;
        const posts = await Post.find({ creator: id }).sort({ createdAt: -1 });
        res.status(200).json(posts);
    } catch (error) {
        return next(new HttpError(error))
    }
}


// Edit Post
// PUT:api/posts/:id
// PROTECTED
const editPost = async (req, res, next) => {
    try {
        const postId = req.params.id;
        let { title, category, description } = req.body;
        let updatedPost;

        if (!title || !category || !description) {
            return next(new HttpError("Fill all fields", 422));
        }


        const oldPost=await Post.findById(postId)
        if(req.user.id == oldPost.creator){
            

            if (!req.files || !req.files.thumbnail) {
                // Update only text fields
               
                updatedPost = await Post.findByIdAndUpdate(postId, { title, category, description }, { new: true });
            } else {
                // Get old post from database
                const oldPost = await Post.findById(postId);
    
                // Delete old thumbnail from uploads
                fs.unlink(path.join(__dirname, '..', 'uploads', oldPost.thumbnail), (err) => {
                    if (err) {
                        return next(new HttpError(err.message, 500));
                    }
                });
    
                // Upload new thumbnail
                const { thumbnail } = req.files;
                if (thumbnail.size > 2000000) {
                    return next(new HttpError("Thumbnail too big, size should be less than 2MB", 422));
                }
                const fileName = thumbnail.name;
                const splittedFileName = fileName.split('.');
                const newFileName = `${splittedFileName[0]}_${uuid()}.${splittedFileName[splittedFileName.length - 1]}`;
    
                await thumbnail.mv(path.join(__dirname, '..', 'uploads', newFileName));
    
                // Update post with new thumbnail
                updatedPost = await Post.findByIdAndUpdate(postId, { title, category, description, thumbnail: newFileName }, { new: true });
            }
        }else{
            return next(new HttpError("User not authorized", 400));
        }
    
            if (!updatedPost) {
                return next(new HttpError("Couldn't update post", 400));
            }
    
            res.status(200).json(updatedPost);
        
        
    } catch (error) {
        return next(new HttpError(error.message, 500));
    }
};


// delete Post
// DELETE:api/posts/:id
// PROTECTED
const deletePost = async (req, res, next) => {
    try {
        const postId = req.params.id;
        if (!postId) {
            return next(new HttpError("Post Not Found", 422))
        }

        const post = await Post.findById(postId);
        const fileName = post?.thumbnail;

        if (req.user.id == post.creator) {

            fs.unlink(path.join(__dirname, "..", "uploads", fileName), async (error) => {
                if (error) {
                    return next(new HttpError(error))
                } else {
                    await Post.findByIdAndDelete(postId)

                    // find the user and reduce the post count 1
                    const currentUser = await User.findById(req.user.id)
                    const userPostCount = currentUser?.posts - 1;
                    await User.findByIdAndUpdate(req.user.id, { posts: userPostCount })
                }
            })
            res.json(`Post ${postId} Deleted Successfully`)
        }else{
            return next(new HttpError("Post couldn't be delete",403));
        }
    } 
    catch (error) {
        return next(new HttpError(error.message, 500));
    }
}


module.exports = { createPost, getPosts, getPost, getCatPosts, getUserPosts, editPost, deletePost }