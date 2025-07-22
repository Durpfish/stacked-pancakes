const express = require('express');
const router = express.Router();
const { requireAuth } = require('../handlers/users.handlers');
const {
    handleVoteQuestion,
    handleVoteAnswer,
} = require('../handlers/votes.handlers');

router.put("/questions/:id/vote", requireAuth, handleVoteQuestion);
router.post("/questions/:id/vote", requireAuth, handleVoteQuestion);

router.put("/answers/:id/vote", requireAuth, handleVoteAnswer);
router.post("/answers/:id/vote", requireAuth, handleVoteAnswer);

router.get("/questions/:id/vote/status", requireAuth);

module.exports = router; 