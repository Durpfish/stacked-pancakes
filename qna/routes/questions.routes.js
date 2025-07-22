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



// Public routes (read-only)
router.get("/", handleListQuestions);

// POST routes must come BEFORE the /:id GET route to avoid conflicts
router.post("/", requireAuth, handleCreateQuestion);
router.post("/:id/update", requireAuth, handleUpdateQuestion);

// Explicit POST route for DELETE
router.post("/:id/delete", requireAuth, (req, res) => {
    req.originalPath = req.path;
    
    handleDeleteQuestion(req, res).then(() => {
        if (!res.headersSent) {
            res.redirect(303, "/questions?success=Question deleted successfully!");
        }
    }).catch(err => {
        console.error("[ROUTES] Error in delete handler:", err);
        if (!res.headersSent) {
            res.redirect(303, "/questions?error=Failed to delete question. Please try again.");
        }
    });
});

// GET routes for specific questions (must come AFTER POST routes)
router.get("/:id/edit", requireAuth, handleEditQuestion);
router.get("/:id", handleViewQuestion);

module.exports = router; 