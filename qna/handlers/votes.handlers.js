const {
    voteQuestion,
    voteAnswer,
    getUserVote,
    getQuestionById,
    getAnswerById
} = require("../lib/database");

async function handleVoteQuestion(req, res) {
    const { id } = req.params;
    const { voteType } = req.body;
    const userId = req.session.userId;

    try {
        // check if user has already voted
        const currentVote = await getUserVote(userId, id);
        
        // if user clicks the same vote type, treat it as a toggle
        const newVoteType = currentVote === voteType ? null : voteType;
        
        await voteQuestion(id, userId, newVoteType);
        
        // get updated question to get accurate vote count
        const question = await getQuestionById(id);
        const upVotes = question.votes?.up?.length || 0;
        const downVotes = question.votes?.down?.length || 0;
        const netVotes = upVotes - downVotes;
        
        res.json({ 
            success: true, 
            userVote: newVoteType,
            netVotes: netVotes
        });
    } catch (error) {
        console.error('Vote error:', error);
        res.status(500).json({
            success: false,
            error: "Error processing vote"
        });
    }
}

async function handleVoteAnswer(req, res) {
    const { id } = req.params;
    const { voteType } = req.body;
    const userId = req.session.userId;

    try {
        // check if user has already voted
        const currentVote = await getUserVote(userId, null, id);
        
        // if user clicks the same vote type, treat it as a toggle
        const newVoteType = currentVote === voteType ? null : voteType;
        
        await voteAnswer(id, userId, newVoteType);
        
        // get updated answer to get accurate vote count
        const answer = await getAnswerById(id);
        const upVotes = answer.votes?.up?.length || 0;
        const downVotes = answer.votes?.down?.length || 0;
        const netVotes = upVotes - downVotes;
        
        res.json({ 
            success: true, 
            userVote: newVoteType,
            netVotes: netVotes
        });
    } catch (error) {
        console.error('Vote error:', error);
        res.status(500).json({
            success: false,
            error: "Error processing vote"
        });
    }
}

module.exports = {
    handleVoteQuestion,
    handleVoteAnswer
}; 