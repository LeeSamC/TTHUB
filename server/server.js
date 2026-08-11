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


const {eq, and} = require('drizzle-orm')
const {db} = require('./db')
const {users, refreshTokens} = require('./schema');

const app = express();

const PORT = 3000

// ==============================================
// GLOBAL MIDDLEWARE
// ==============================================

//Adds ecurity related headers
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
    maxAge: 15 * 60 * 1000
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


// ============================================================
// ACCESS TOKEN AUTHENTICATION MIDDLEWARE
// ============================================================

//Protects routes that require authentication
const authenicateToken = (req, res, next) => {
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
        await db.update(refreshTokens).set({revoked:true}).where(eq(refreshTokens.token, refreshToken))
    }

    res.clearCookie('accessToken', ACCESS_COOKIE_OPTIONS);
    res.clearCookie('refreshToken', REFRESH_COOKIE_OPTIONS);
    res.status(200).json({message: 'Sucessfully Logged Out'})
})


app.get('/api/profile', authenicateToken, async (req, res) => {

    const currentUserId = req.user.userId

    try{
        const result = await db.select({
            userId: users.userId,
            firstName: users.firstName,
            lastName: users.lastName,
            username: users.username,
            createdAt: users.createdAt,
            }).from(users).where(eq(users.userId, currentUserId));
        
        if (result.length === 0 ) {
            return res.status(404).json({error: 'User not found'});
        }

        res.status(200).json(result[0])

    }catch (error) {
        res.status(500).json({error: 'Failed to retrieve profile'})
    }
})


app.listen(3000, () => {
    console.log(`Server is running on http://localhost:3000`)
})