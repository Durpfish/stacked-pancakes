const express = require('express');
const router = express.Router();
const { requireAuth } = require('../handlers/users.handlers');
const {
    handleCreateQuestion,
    handleListQuestions,
    handleViewQuestion,
    handleEditQuestion,
    handleUpdateQuestion,
    handleDeleteQuestion,
    handleNewQuestionPage
} = require('../handlers/questions.handlers');

router.get("/ask/new", requireAuth, handleNewQuestionPage);

// Diagnostic route to check authentication status
router.get("/debug-auth", (req, res) => {
    const auth = {
        sessionID: req.sessionID,
        session: req.session,
        userId: req.session.userId,
        username: req.session.username,
        isAuthenticated: !!req.session.userId,
        cookies: req.cookies,
        headers: req.headers
    };
    
    console.log('[DEBUG_AUTH] Session data:', JSON.stringify(auth, null, 2));
    
    res.render("debug", {
        title: "Auth Debug - QnA",
        auth,
        layout: 'layout'
    });
});

// Public routes (read-only)
router.get("/", handleListQuestions);

// POST routes must come BEFORE the /:id GET route to avoid conflicts
router.post("/", requireAuth, handleCreateQuestion);
router.post("/:id/update", requireAuth, handleUpdateQuestion);

// Explicit POST route for DELETE
router.post("/:id/delete", requireAuth, (req, res) => {
    console.log("[ROUTES] Received POST request for delete with method override");
    req.originalPath = req.path;
    
    handleDeleteQuestion(req, res).then(() => {
        if (!res.headersSent) {
            console.log("[ROUTES] Headers not sent, forcing redirect to questions list");
            res.redirect(303, "/questions?success=Question deleted successfully!");
        }
    }).catch(err => {
        console.error("[ROUTES] Error in delete handler:", err);
        if (!res.headersSent) {
            console.log("[ROUTES] Error detected but redirecting to questions list anyway");
            res.redirect(303, "/questions?error=Failed to delete question. Please try again.");
        }
    });
});

// GET routes for specific questions (must come AFTER POST routes)
router.get("/:id/edit", requireAuth, handleEditQuestion);
router.get("/:id", handleViewQuestion);

module.exports = router; 