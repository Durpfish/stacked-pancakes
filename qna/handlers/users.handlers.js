const { 
    getUserByUsername,
    createUser,
    getUserById,
    updateUser,
    getQuestions,
    getUserVote,
    getAnswers
} = require("../lib/database");
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { CloudinaryStorage } = require('multer-storage-cloudinary');
const cloudinary = require('../lib/cloudinary');

const storage = new CloudinaryStorage({
  cloudinary: cloudinary,
  params: {
    folder: 'profile_pictures',
    allowed_formats: ['jpg', 'png', 'jpeg', 'gif', 'webp'],
    transformation: [{ width: 300, height: 300, crop: 'limit' }]
  }
});

const upload = multer({ storage: storage });
const uploadProfilePicture = upload.single('profilePicture');

async function handleLogin(req, res) {
    const { username, password } = req.body;
    const redirect = req.body.redirect || '/';
    
    const foundUser = await getUserByUsername(username);
    if (foundUser && foundUser.password === password) {
        // creating a session resource
        req.session.userId = foundUser._id;
        req.session.username = foundUser.username;
        
        console.log(`[LOGIN] User ${username} logged in successfully, redirecting to: ${redirect}`);
        console.log(`[LOGIN] Session ID: ${req.sessionID}`);
        console.log(`[LOGIN] Session data set:`, { userId: req.session.userId, username: req.session.username });
        
        // Save session explicitly
        req.session.save((err) => {
            if (err) {
                console.error('[LOGIN] Error saving session:', err);
            } else {
                console.log('[LOGIN] Session saved successfully');
            }
            res.redirect(303, redirect);
        });
    } else {
        res.render("login", {
            title: "Login - QnA",
            layout: false,
            error: "Invalid username or password",
            redirect: redirect
        });
    }
}

function handleLoginPage(req, res) {
    // check if there's a redirect parameter
    const redirect = req.query.redirect || '/';
    
    res.render("login", {
        title: "Login - QnA",
        layout: false,
        redirect: redirect
    });
}

function handleRegisterPage(req, res) {
    // check if there's a redirect parameter
    const redirect = req.query.redirect || '/';
    
    res.render("register", {
        title: "Register - QnA",
        layout: false,
        redirect: redirect
    });
}

async function handleRegister(req, res) {
    uploadProfilePicture(req, res, async function(err) {
        if (err) {
            return res.render("register", {
                title: "Register - QnA",
                layout: false,
                error: err.message,
                redirect: req.body.redirect
            });
        }

        const { username, email, password, bio, redirect } = req.body;
        const redirectUrl = redirect || '/';

        if (!username || !email || !password) {
            return res.render("register", {
                title: "Register - QnA",
                layout: false,
                error: "All required fields must be filled out",
                redirect: redirectUrl
            });
        }
        
        // validate username format
        if (!/^[a-zA-Z0-9_]{3,20}$/.test(username)) {
            return res.render("register", {
                title: "Register - QnA",
                layout: false,
                error: "Username must be 3-20 characters and can only contain letters, numbers, and underscores",
                redirect: redirectUrl
            });
        }

        // validate password length
        if (password.length < 8) {
            return res.render("register", {
                title: "Register - QnA",
                layout: false,
                error: "Password must be at least 8 characters long",
                redirect: redirectUrl
            });
        }

        // check if user already exists
        const existingUser = await getUserByUsername(username);
        if (existingUser) {
            return res.render("register", {
                title: "Register - QnA",
                layout: false,
                error: "Username already exists",
                redirect: redirectUrl
            });
        }

        try {
            const userData = {
                username,
                email,
                password,
                bio: bio || ''
            };

            if (req.file && req.file.path) {
                userData.profilePicture = req.file.path;
            } else {
                userData.profilePicture = "/assets/images/default-avatar.png";
            }

            const userId = await createUser(
                userData.username,
                userData.email,
                userData.password,
                userData.bio,
                userData.profilePicture
            );

            req.session.userId = userId;
            req.session.username = username;

            console.log(`[REGISTER] User ${username} registered and logged in successfully, redirecting to: ${redirectUrl}`);

            res.redirect(redirectUrl);
        } catch (error) {
            console.error('Registration error:', error);
            res.render("register", {
                title: "Register - QnA",
                layout: false,
                error: "Error creating user. Please try again.",
                redirect: redirectUrl
            });
        }
    });
}

function handleLogout(req, res) {
    console.log('[LOGOUT] Session before destroy:', req.session);
    console.log('[LOGOUT] Session ID:', req.sessionID);
    console.log('[LOGOUT] Cookies before clearing:', req.headers.cookie);
    
    const cookieName = req.app.get('trust proxy') && req.app.get('trust proxy') !== 'false' 
        ? 'qna.sid.proxy' 
        : 'qna.sid';
    
    // deleting the session resource
    req.session.destroy((err) => {
        if (err) {
            console.error('[LOGOUT] Error destroying session:', err);
        } else {
            console.log('[LOGOUT] Session successfully destroyed');
        }
        
        // clear all possible session cookies
        res.clearCookie('qna.sid');
        res.clearCookie('connect.sid');
        res.clearCookie(cookieName);
        
        // force cookie to expire
        res.cookie('qna.sid', '', { 
            expires: new Date(0),
            path: '/'
        });
        
        console.log('[LOGOUT] Cookies cleared');
        
        // redirect to login page with cache-busting parameter
        res.redirect('/login?t=' + Date.now());
    });
}

async function handleViewProfile(req, res) {
    try {
        let userId = req.params.userId;
        
        // if no userId in params, use session userId
        if (!userId) {
            userId = req.session.userId;
        }
        
        console.log(`[PROFILE] Viewing profile for user ID: ${userId}`);
        console.log(`[PROFILE] Session user ID: ${req.session.userId}`);
        console.log(`[PROFILE] Request path: ${req.path}`);
        
        const user = await getUserById(userId);
        
        if (!user) {
            console.error(`[PROFILE] User not found for ID: ${userId}`);
            return res.status(404).render("error", {
                title: "Error - QnA",
                message: "User not found"
            });
        }

        res.render("profile", {
            title: `${user.username}'s Profile - QnA`,
            layout: 'layout',
            profile: {
                username: user.username,
                email: user.email,
                bio: user.bio,
                profilePicture: user.profilePicture,
                createdAt: user.createdAt
            },
            isOwnProfile: String(userId) === String(req.session.userId)
        });
    } catch (error) {
        console.error('[PROFILE] Error viewing profile:', error);
        res.status(500).render("error", {
            title: "Error - QnA",
            message: "An error occurred while loading the profile"
        });
    }
}

async function handleUpdateProfile(req, res) {
    console.log(`[PROFILE UPDATE] Received profile update request from user ID: ${req.session.userId}`);
    console.log(`[PROFILE UPDATE] Request method: ${req.method}`);
    console.log(`[PROFILE UPDATE] Request path: ${req.path}`);
    
    uploadProfilePicture(req, res, async function(err) {
        if (err) {
            console.error(`[PROFILE UPDATE] Error uploading profile picture: ${err.message}`);
            return res.render("profile", {
                title: "My Profile - QnA",
                layout: 'layout',
                error: err.message,
                profile: {
                    username: req.session.username,
                    email: req.body.email,
                    bio: req.body.bio,
                    profilePicture: null,
                    createdAt: new Date()
                },
                isOwnProfile: true
            });
        }
        
        const userId = req.session.userId;
        const { username, email, bio, currentPassword, newPassword } = req.body;
        
        console.log(`[PROFILE UPDATE] Processing profile update for username: ${username}`);
        
        const user = await getUserById(userId);
        if (!user || user.password !== currentPassword) {
            return res.render("profile", {
                title: "My Profile - QnA",
                layout: 'layout',
                error: "Current password is incorrect",
                profile: {
                    username: user.username,
                    email: user.email,
                    bio: user.bio,
                    profilePicture: user.profilePicture,
                    createdAt: user.createdAt
                },
                isOwnProfile: true
            });
        }

        if (username !== user.username) {
            if (!username || username.length < 3 || username.length > 20 || !/^[a-zA-Z0-9_]+$/.test(username)) {
                return res.render("profile", {
                    title: "My Profile - QnA",
                    layout: 'layout',
                    error: "Username must be 3-20 characters and can only contain letters, numbers, and underscores",
                    profile: {
                        username: user.username,
                        email: user.email,
                        bio: user.bio,
                        profilePicture: user.profilePicture,
                        createdAt: user.createdAt
                    },
                    isOwnProfile: true
                });
            }
            
            const existingUser = await getUserByUsername(username);
            if (existingUser) {
                return res.render("profile", {
                    title: "My Profile - QnA",
                    layout: 'layout',
                    error: "Username already exists",
                    profile: {
                        username: user.username,
                        email: user.email,
                        bio: user.bio,
                        profilePicture: user.profilePicture,
                        createdAt: user.createdAt
                    },
                    isOwnProfile: true
                });
            }
        }

        const updates = {
            username,
            email,
            bio
        };

        if (newPassword) {
            updates.password = newPassword;
        }

        if (req.file) {
            try {
                const profilePicturePath = req.file.path;
                updates.profilePicture = profilePicturePath;
                
                if (user.profilePicture && 
                    user.profilePicture.startsWith('/assets/images/') && 
                    !user.profilePicture.includes('default-avatar')) {
                    const oldPicturePath = path.join('public', user.profilePicture);
                    if (fs.existsSync(oldPicturePath)) {
                        fs.unlinkSync(oldPicturePath);
                    }
                }
            } catch (err) {
                console.error('Error processing profile picture:', err);
            }
        }

        try {
            await updateUser(userId, updates);
            
            if (username !== user.username) {
                req.session.username = username;
            }
            
            res.redirect("/profile");
        } catch (error) {
            res.render("profile", {
                title: "My Profile - QnA",
                layout: 'layout',
                error: "Error updating profile",
                profile: {
                    username: user.username,
                    email: user.email,
                    bio: user.bio,
                    profilePicture: user.profilePicture,
                    createdAt: user.createdAt
                },
                isOwnProfile: true
            });
        }
    });
}

async function handleMainPage(req, res) {
    const page = parseInt(req.query.page) || 1;
    const tag = req.query.tag;

    // Always sort by newest
    const sortQuery = { createdAt: -1 };

    let filter = {};
    if (tag) {
        filter.tags = tag;
    }

    try {
        const userId = req.session.userId;
        let username = null;

        if (userId) {
            const user = await getUserById(userId);
            username = user ? user.username : null;
        }

        const result = await getQuestions(filter, sortQuery, page, 3);
        
        console.log(`[MAIN_PAGE] Retrieved ${result.questions.length} questions`);

        // in case questions do not get safely deleted
        const processedQuestionsPromises = result.questions.map(async (question) => {
            if (!question.title || !question.body) {
                console.log(`[MAIN_PAGE] Skipping question with missing title/body: ${question._id}`);
                return null;
            }
            
            const author = await getUserById(question.userId);
            
            if (!author) {
                console.log(`[MAIN_PAGE] Skipping question with missing author: ${question._id}`);
                return null;
            }
            
            const answers = await getAnswers(question._id);
            
            const upVotes = question.votes?.up?.length || 0;
            const downVotes = question.votes?.down?.length || 0;
            const netVotes = upVotes - downVotes;
            
            return {
                ...question,
                answerCount: answers ? answers.length : 0,
                netVotes,
                author: {
                    username: author.username,
                    profilePicture: author.profilePicture
                }
            };
        });
        
        const questionsWithAuthors = (await Promise.all(processedQuestionsPromises))
            .filter(question => question !== null);
            
        console.log(`[MAIN_PAGE] After filtering: ${questionsWithAuthors.length} valid questions`);

        const recentResult = await getQuestions({}, { createdAt: -1 }, 1, 5);
        const processedRecentQuestionsPromises = recentResult.questions.map(async (question) => {
            if (!question.title || !question.body) {
                console.log(`[MAIN_PAGE] Skipping recent question with missing title/body: ${question._id}`);
                return null;
            }
            
            const author = await getUserById(question.userId);

            if (!author) {
                console.log(`[MAIN_PAGE] Skipping recent question with missing author: ${question._id}`);
                return null;
            }
            
            const answers = await getAnswers(question._id);

            const upVotes = question.votes?.up?.length || 0;
            const downVotes = question.votes?.down?.length || 0;
            const netVotes = upVotes - downVotes;
            
            return {
                ...question,
                answerCount: answers ? answers.length : 0,
                netVotes,
                author: {
                    username: author.username,
                    profilePicture: author.profilePicture
                }
            };
        });

        const recentQuestionsWithAuthors = (await Promise.all(processedRecentQuestionsPromises))
            .filter(question => question !== null);
            
        console.log(`[MAIN_PAGE] After filtering: ${recentQuestionsWithAuthors.length} valid recent questions`);
        
        const estimatedValidRatio = questionsWithAuthors.length / (result.questions.length || 1);
        const adjustedTotal = Math.floor(result.total * estimatedValidRatio);
        const adjustedTotalPages = Math.max(1, Math.ceil(adjustedTotal / 3));

        res.render("main", {
            title: "QnA - Home",
            layout: 'layout',
            username,
            questions: questionsWithAuthors,
            recentQuestions: recentQuestionsWithAuthors,
            currentPage: page,
            totalPages: adjustedTotalPages,
            tag
        });
    } catch (error) {
        console.error('[MAIN_PAGE] Error rendering main page:', error);
        res.render("main", {
            title: "QnA - Home",
            layout: 'layout',
            username: null,
            questions: [],
            recentQuestions: [],
            currentPage: 1,
            totalPages: 1,
            error: "Error loading questions",
            tag: null
        });
    }
}

function requireAuth(req, res, next) {
    console.log(`[AUTH] Checking auth for path: ${req.path}`);
    console.log(`[AUTH] Session:`, req.session);
    console.log(`[AUTH] User ID in session: ${req.session?.userId}`);
    
    if (req.session && req.session.userId) {
        console.log(`[AUTH] User authenticated: ${req.session.userId}`);
        next();
    } else {
        console.log(`[AUTH] Authentication failed, redirecting to login`);
        const redirectUrl = encodeURIComponent(req.originalUrl);
        res.redirect(`/login?redirect=${redirectUrl}`);
    }
}

module.exports = {
    handleLogin,
    handleLoginPage,
    handleRegisterPage,
    handleRegister,
    handleLogout,
    handleViewProfile,
    handleUpdateProfile,
    handleMainPage,
    requireAuth
};
