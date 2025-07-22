const express = require('express');
const router = express.Router();
const { 
    handleLogin, 
    handleLoginPage,
    handleRegisterPage,
    handleRegister,
    handleLogout,
    handleViewProfile,
    handleUpdateProfile,
    handleMainPage,
    requireAuth 
} = require('../handlers/users.handlers');

// View-related routes
router.get("/", handleMainPage);
router.get("/login", handleLoginPage);
router.get("/register", handleRegisterPage);

// Authentication as a resource
router.post("/sessions", handleLogin); // Create a session (login)
router.post("/logout", handleLogout); // POST route for logout
router.get("/logout", handleLogout); // Alternative GET route for logout

router.post("/users", handleRegister); // Create a user (register)

// Profile management
router.get("/users/profile", requireAuth, handleViewProfile); // Get current user profile
router.get("/users/:userId", requireAuth, handleViewProfile); // Get specific user profile
router.post("/users/profile/update", requireAuth, handleUpdateProfile); // Direct POST endpoint for profile updates

// Additional direct routes for profiles
router.get("/profile", requireAuth, handleViewProfile); // Shortcut for current user's profile
router.get("/profile/:userId", requireAuth, handleViewProfile); // Shortcut for specific user profile

// Fallback POST handler for accidental POSTs to root
router.post("/", (req, res) => {
  res.redirect("/");
});

// About page
router.get("/aboutus", async (req, res) => {
    try {
        const userId = req.session.userId;
        let username = null;

        if (userId) {
            const { getUserById } = require('../lib/database');
            const user = await getUserById(userId);
            username = user ? user.username : null;
        }

        res.render('aboutus', { 
            title: 'About Stacked Pancakes', 
            username: username,
            userId: userId
        });
    } catch (error) {
        console.error('Error rendering About Us page:', error);
        res.render('aboutus', { 
            title: 'About Stacked Pancakes',
            username: null,
            userId: null
        });
    }
});

module.exports = router; 