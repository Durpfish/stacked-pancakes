const express = require("express");
const bodyParser = require("body-parser");
const session = require('express-session');
const expressLayouts = require('express-ejs-layouts');
const path = require("path");
const MongoStore = require('connect-mongo');

const userRoutes = require('./routes/users.routes');
const questionRoutes = require('./routes/questions.routes');
const answerRoutes = require('./routes/answers.routes');
const voteRoutes = require('./routes/votes.routes');

const app = express();
const port = 3000;

// middleware setup
app.use(express.urlencoded({ extended: false }));
app.use(bodyParser.json());

// debugging middleware to log the method for each request
app.use((req, res, next) => {
    const originalUrl = req.originalUrl || req.url;
    console.log(`[REQUEST] ${req.method} ${originalUrl}`);
    
    // log request body for debugging
    if (req.body && Object.keys(req.body).length > 0) {
        console.log(`[REQUEST] Body:`, JSON.stringify(req.body));
    }
    
    // log method override
    if (req.body && req.body._method) {
        console.log(`[REQUEST] Method override: ${req.body._method}`);
        console.log(`[REQUEST] Original method was ${req.method}, will be processed as ${req.body._method}`);
    }
    
    if (req.method === 'DELETE' || (req.body && req.body._method === 'DELETE')) {
        console.log(`[REQUEST] DELETE detected for path: ${originalUrl}`);
        console.log(`[REQUEST] DELETE params:`, JSON.stringify(req.params));
        console.log(`[REQUEST] DELETE query:`, JSON.stringify(req.query));
        
        req.originalHttpMethod = req.method;
    }
    
    next();
});

app.set("view engine", "ejs");
app.set("views", path.join(__dirname, "views"));
app.use(expressLayouts);
app.use(express.static(path.join(__dirname, "public")));

app.set('trust proxy', 1);
app.use(
    session({
        secret: "SOME_SECRET_KEY",
        resave: false,
        saveUninitialized: false,
        store: MongoStore.create({
            mongoUrl: process.env.MONGODB_URI,
            dbName: "qna",
            collectionName: "sessions"
        }),
        cookie: {
            secure: true,
            httpOnly: true,
            maxAge: 24 * 60 * 60 * 1000,
            sameSite: 'none',
            path: '/'
        },
        name: 'qna.sid',
        rolling: true
    })
);

// cache control middleware for authentication-related routes
app.use((req, res, next) => {
    if (req.path.includes('login') || req.path.includes('logout') || req.path === '/sessions') {
        res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
        res.setHeader('Pragma', 'no-cache');
        res.setHeader('Expires', '0');
        res.setHeader('Surrogate-Control', 'no-store');
    }
    next();
});

// make common data available to all views
app.use((req, res, next) => {
    // Debug session information
    console.log(`[SESSION DEBUG] Session ID: ${req.sessionID}`);
    console.log(`[SESSION DEBUG] User ID in session: ${req.session?.userId}`);
    console.log(`[SESSION DEBUG] Is authenticated: ${!!req.session?.userId}`);
    console.log(`[SESSION DEBUG] Cookies:`, req.headers.cookie);
    console.log(`[SESSION DEBUG] Session store:`, req.sessionStore ? 'MongoDB' : 'Memory');

    if (req.originalUrl.includes('/questions') && req.method !== 'GET') {
        console.log(`[SESSION] Session ID: ${req.sessionID}`);
        console.log(`[SESSION] User ID in session: ${req.session?.userId}`);
        console.log(`[SESSION] Is authenticated: ${!!req.session?.userId}`);
        console.log(`[SESSION] Cookies:`, req.headers.cookie);
    }

    res.locals.userId = req.session?.userId || null;
    res.locals.isAuthenticated = !!req.session?.userId;
    res.locals.username = req.session?.username || null;
    
    next();
});

// serve static files from public directory
app.use('/assets', express.static(path.join(__dirname, "public/assets"), {
    etag: false,
    maxAge: 0,
    lastModified: false
}));

app.get('/debug-css', (req, res) => {
    res.sendFile(path.join(__dirname, 'public/assets/css/main.css'));
});

app.use('/', userRoutes);
app.use('/questions', questionRoutes);
app.use('/', answerRoutes);
app.use('/', voteRoutes);

app.use((err, req, res, next) => {
    console.error(err.stack);
    res.status(500).render('error', {
        title: 'Error - QnA',
        message: 'Something went wrong!'
    });
});

module.exports = app;