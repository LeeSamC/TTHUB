//Web Framework used to create the HTTP and define routes
const express = require('express')

//Adds various HTTP security headers to responses to protect the application against common web vulnerabilities
const helmet = require('helmet')

//Prevents users from making too many request (Helps with brute froce attacks)
const rateLimit = require('express-rate-limit')

//Controls which frontend applications are allowed to communicate with the backend
const cors = require('cors')

//Reads cookies sent by the broswer and makes them available through req.cookies
const cookieParser = require('cookie-parser')

//Used to securely hash passwords and compare plaintext passwords against hased ones
const bcrypt = require('bcryptjs')

//Used to create and verify JWT access/refresh tokens
const jwt = require('jsonwebtoken')

//Validate incoming request data
const {z} = require('zod')


const {eq, and, isNull, desc} = require('drizzle-orm')
const {db} = require('./db')
const {users, refreshTokens, posts} = require('./schema');

const app = express();

const PORT = 3000

// ==============================================
// GLOBAL MIDDLEWARE
// ==============================================

//Adds security related headers
app.use(helmet())

//Reads cookies from incoming requests
app.use(cookieParser())

// Allows expressto automatically parse json bodies
app.use(express.json())



// ==============================================
// CORS CONFIGURATION
// ==============================================

//Controls which frontend is allowed to make cross-origin request to this backend
app.use(cors({
    origin: 'http://localhost:5173',

    //Allows the browser to send cookies with request 
    credentials: true
}))


// ==============================================
// RATE LIMITING
// ==============================================

//Creates a rate limiter specifically for authentication routes
const authLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 5,
    message: {error: 'Too many authenication attempts. Please try again after 15 minutes'},
    standardHeaders: true,
    legacyHeaders: false
})

app.use('/api/auth/login', authLimiter)
app.use('/api/auth/register', authLimiter)


// ==============================================
// COOKIE CONFIGURATIONS
// ==============================================

const ACCESS_COOKIE_OPTIONS = {
    //Javascript running in the browser cannot access this cookie
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',

    //Control when broswers send cookies - lax = Default
    sameSite: 'lax',
    maxAge: 15 * 60 * 1000,

    path: '/'
}

const REFRESH_COOKIE_OPTIONS = {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    //This cookie will only be sent to URL under /api/auth
    path: '/api/auth',
    maxAge: 7 * 24 * 60 * 60 * 1000 
}

// =========================================
// TOKEN CREATION FUNCTION
// =========================================


async function issueTokens(userId, res) {

    const accessToken = jwt.sign({userId}, process.env.ACCESS_TOKEN_SECRET, {expiresIn: '15m'});

    const refreshToken = jwt.sign({userId}, process.env.REFRESH_TOKEN_SECRET, {expiresIn: '7d'})

    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
    await db.insert(refreshTokens).values({
        token: refreshToken,
        userId: userId,
        expiresAt: expiresAt
    });

    res.cookie('accessToken', accessToken, ACCESS_COOKIE_OPTIONS);
    res.cookie('refreshToken', refreshToken, REFRESH_COOKIE_OPTIONS);
}

// ============================================================
// REQUEST VALIDATION SCHEMAS
// ============================================================


const registerSchema = z.object({
    firstName: z.string().min(1, "First Name is required"),
    lastName: z.string().min(1, "Last Name is required"),
    username: z.string().min(3, "Username must be at least 3 characters"),
    password: z.string().min(8, "Password must be at least 8 characters"),
})

const loginSchema = z.object({
    username: z.string().min(1, "Username is required"),
    password: z.string().min(1, "Password is required")
})

const userUpdateSchema = z.object({
    firstName: z.string().min(1, "First name is required"),
    lastName: z.string().min(1, "Last name is required"),
    username: z.string().min(3, "Username must be at least 3 charachers"),
})



const createPostSchema = z.object({
    content: z.string().trim().min(1, 'Post content cannot be empty').max(5000, 'Post content cannot exceed 5000 characters')
})

const updatePostSchema = z.object({
    content: z.string().trim().min(1, 'Post content cannot be empty').max(5000, 'Post content cannot exceed 5000 characters')
})




// ============================================================
// ACCESS TOKEN AUTHENTICATION MIDDLEWARE
// ============================================================

//Protects routes that require authentication
const authenticateToken = (req, res, next) => {
    const accessToken = req.cookies.accessToken;

    if(!accessToken){
        return res.status(401).json({error: 'Access Token missing or expired'});
    }

    jwt.verify(accessToken, process.env.ACCESS_TOKEN_SECRET, (err, decoded) => {
        if (err) {
            return res.status(401).json({error: 'Invalid or Expired Access Token'})
        }
        req.user = decoded;
        next()
    })

};


app.post('/api/auth/register', async (req, res) => {
    const validation = registerSchema.safeParse(req.body)
    if(!validation.success) {
        return res.status(400).json({error: validation.error.flatten().fieldErrors})
    }

    const { firstName, lastName, username, password } = validation.data

    try{
        const existing = await db.select().from(users).where(eq(users.username, username))

        if (existing.length > 0) {
            return res.status(400).json({ error: 'Username is already taken'})
        }

        const hashedPassword = await bcrypt.hash(password, 10)

        const [newUser] = await db.insert(users).values({firstName, lastName, username, password: hashedPassword}).returning();

        await issueTokens(newUser.userId, res)

        const {password: _, ...userWithoutPassword } = newUser;
        res.status(201).json({
            user: userWithoutPassword
        })
    }catch (error) {
        console.log(error)
        res.status(500).json({error: 'Registration failed'})
    }
})

app.post('/api/auth/login', async (req, res) => {
    const validation = loginSchema.safeParse(req.body);
    if (!validation.success) {
        return res.status(400).json({error: validation.error.flatten().fieldErrors})
    }

    const {username, password} = validation.data

    try{
        const result = await db.select().from(users).where(eq(users.username, username))
        if (result.length === 0 ){
            return res.status(401).json({error: 'Invalid username or password'})
        }

        const user = result[0]

        const isPasswordValid = await bcrypt.compare(password, user.password);
        if (!isPasswordValid) {
            return res.status(401).json({ error: 'Invalid username or password'})
        }


        await issueTokens(user.userId, res)

        res.status(200).json({
            message: 'Login successful'
        });
    }catch (error){
        console.error(error)
        res.status(500).json({error: 'Login failed'})
    }
})

app.post('/api/auth/refresh', async (req, res) => {
    const refreshToken = req.cookies.refreshToken;

    if(!refreshToken){
        return res.status(401).json({error: 'Refresh token missing'})
    }

    try{
        const decoded = jwt.verify(refreshToken, process.env.REFRESH_TOKEN_SECRET)

        const savedToken = await db.select().from(refreshTokens).where(and(eq(refreshTokens.token, refreshToken), eq(refreshTokens.revoked, false)))

        if (savedToken.length === 0) {
            return res.status(403).json({error: 'Invalid or revoked refresh token'})
        }

        await db.update(refreshTokens).set({revoked: true}).where(eq(refreshTokens.token, refreshToken))

        await issueTokens(decoded.userId, res);

        res.status(200).json({message: 'Token Refresh Successful'})
    }catch (err) {
        res.status(403).json({error: 'Expired or invalid refresh token'})
    }
})

app.post('/api/auth/logout', async (req, res) =>{
    const refreshToken = req.cookies.refreshToken;

    if(refreshToken) {
        try{
            await db.update(refreshTokens).set({revoked:true}).where(eq(refreshTokens.token, refreshToken))
        }catch (err){
            console.error('Error revoking token in DB:', err);
        }
        
    }

    res.clearCookie('accessToken', ACCESS_COOKIE_OPTIONS);
    res.clearCookie('refreshToken', REFRESH_COOKIE_OPTIONS);
    res.status(200).json({message: 'Sucessfully Logged Out'})
})


app.get('/api/profile', authenticateToken, async (req, res) => {

    const currentUserId = req.user.userId

    try{
        const result = await db.select({
            userId: users.userId,
            firstName: users.firstName,
            lastName: users.lastName,
            username: users.username,
            }).from(users).where(eq(users.userId, currentUserId));
        
        if (result.length === 0 ) {
            return res.status(404).json({error: 'User not found'});
        }

        res.status(200).json({user:result[0]})

    }catch (error) {
        res.status(500).json({error: 'Failed to retrieve profile'})
    }
})

app.patch('/api/profile/update', authenticateToken, async (req, res) => {
    const currentUserId = req.user.userId
    const validation = userUpdateSchema.safeParse(req.body)

    if(!validation.success){
        return res.status(400).json({error: 'Invalid input data', details: validation.error.flatten().fieldErrors})
    }

    if(Object.keys(validation.data).length === 0) {
        return res.status(400).json({error: 'No field provided to update'})
    }

    try{
        const updatedUser = await db.update(users).set(validation.data).where(eq(users.userId, currentUserId)).returning({firstName: users.firstName, lastName: users.lastName, username: users.username})

        if(updatedUser.length === 0) {
            return res.status(404).json({error: 'User not found'})
        }

        res.status(200).json({message: 'Successfully Updated ', user: updatedUser[0]})
    }catch (error) {
        console.log('Update Error', error)
        res.status(500).json({error: 'Server Error'})
    }
})

app.delete('/api/profile/delete', authenticateToken, async (req,res) => {
    const currentUserId = req.user.userId
    const {password} = req.body

    if(!password){
        return res.status(400).json({error: 'Password confirmation is required'})
    }

    try{
        const currentUser = await db.select({userId: users.userId, passwordHash: users.password}).from(users).where(eq(users.userId, currentUserId))

        if (currentUser.length === 0){
            return res.status(404).json({error:'User cannot be found '})
        }

        const user = currentUser[0]

        const isPasswordValid = await bcrypt.compare(password, user.passwordHash)
        if(!isPasswordValid){
            return res.status(401).json({error: 'Incorrect Password'})
        }

        await db.delete(users).where(eq(users.userId, currentUserId))
        

        res.clearCookie('accessToken', ACCESS_COOKIE_OPTIONS)
        res.clearCookie('refreshToken', REFRESH_COOKIE_OPTIONS)

        res.status(200).json({message: 'Successfully deleted user'})
    }catch (err) {
        console.log(err)
        res.status(500).json({error: 'Cannot delete user'})
    }
})




app.post('/api/posts', authenticateToken, async (req, res) => {
    const validation = createPostSchema.safeParse(req.body)

    if(!validation.success) {
        return res.status(400).json({error: validation.error.flatten().fieldErrors})
    }

    const userId = req.user.userId

    const {content} = validation.data

    try{
        const [newPost] = await db.insert(posts).values({
            userId: userId,
            content: content
        }).returning()

        return res.status(201).json({message: 'Post created', post: newPost})
    }catch (error) {
        console.error('Create post error', error)

        return res.status(500).json({
            error: 'Failed to create post'
        })
    }
})

app.get('/api/posts/:postId', authenticateToken, async (req, res) => {
    const  {postId} = req.params

    try{
        const result = await db.select({
            postId: posts.postId,
            content: posts.content,
            createdAt: posts.createdAt,
            updatedAt: posts.updatedAt,
            userId: users.userId,
            username: users.username,
            firstName: users.firstName,
            lastName: users.lastName
        }).from(posts).innerJoin(
            users, eq(
                posts.userId,
                users.userId
            )
        ).where(
            and(
                eq(
                    posts.postId, postId
                ),
                isNull(
                    posts.deleteAt
                )
            )
        )

        if(result.length === 0) {
            return res.status(404).json({error: 'Post not found'})
        }

        return res.status(200).json({post: result[0]})

    }catch (error) {
        console.error('Get post error', error)
        return res.status(500).json({error: 'Failed to retrieve post'})
    }
})

app.get('/api/posts', async (req, res) => {

    try{
        const result = await db.select({
            postId: posts.postId,
            content: posts.content,
            createdAt: posts.createdAt,
            updatedAt: posts.updatedAt,
            userId: users.userId,
            username: users.username,
            firstName: users.firstName,
            lastName: users.lastName
        }).from(posts).innerJoin(
            users,
            eq(
                posts.userId,
                users.userId
            )
        ).where(
            isNull(posts.deletedAt)
        ).orderBy(
            desc(posts.createdAt)
        )

        if (result.length === 0){
            return res.status(404).json({error: 'No post found'})
        }

        return res.status(200).json({
            posts: result
        })
    }catch (error) {
        console.error('Get posts error', error)

        return res.status(500).json({error: 'Failed to retrieve posts'})
    }

})

app.patch('/api/posts/:postId', authenticateToken, async (req, res) => {
    const {postId} = req.params

    const userId = req.user.userId

    const validation = updatePostSchema.safeParse(req.body)

    if (!validation.success) {
        return res.status(400).json({error: validation.error.flatten().fieldErrors})
    }

    try{
        const [updatePost] = await db.update(posts).set({content: validation.data.content, updatedAt: new Date()}).where(
            and(
                eq(
                    posts.postId,
                        postId
                ),

                eq(
                    posts.userId,
                    userId
                ),
                isNull(
                    posts.deletedAt
                )
            )
        ).returning()

        if(!updatePost) {
            return res.status(404).json({error: 'Post not found or you do not own this posty'})
        }
        return res.status(200).json({message: 'Post updated successfully', posts: updatePost})
    }catch (error) {
        console.error('Update post error', error)
        return res.status(500).json({error: 'Failed to update post'})
    }
})

app.delete('/api/posts/:postId', authenticateToken, async (req, res) => {

    const {postId} = req.params

    const userId = req.user.userId

    try{
        const [deletedPost] = await db.delete(posts).where(
            and(
                eq(
                    posts.postId,
                    postId
                ),

                eq(
                    posts.userId,
                    userId
                ),

                isNull(
                    posts.deletedAt
                )
            )
        ).returning({postId: posts.postId})

        if(!deletedPost) {
            return res.status(404).json({error: 'Post not found or you do not own this post'})
        }

        return res.status(200).json({message:'Successfully deleted post'})

    }catch (error) {
        console.error('Delete post error', error)
        return res.status(500).json({error: 'Failed to delete post'})
    }
})



module.exports = app