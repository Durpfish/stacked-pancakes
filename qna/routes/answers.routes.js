const express = require('express');
const router = express.Router();
const { requireAuth } = require('../handlers/users.handlers');
const {
    handleCreateAnswer,
    handleUpdateAnswer,
    handleDeleteAnswer
} = require('../handlers/answers.handlers');

// Create a new answer for a question
router.post("/questions/:questionId/answers", requireAuth, handleCreateAnswer);

// Update an existing answer
router.post("/answers/:answerId/update", requireAuth, handleUpdateAnswer);

// Delete an answer
router.post("/answers/:answerId/delete", requireAuth, handleDeleteAnswer);

module.exports = router; 