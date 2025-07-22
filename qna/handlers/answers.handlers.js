const {
    createAnswer,
    updateAnswer,
    deleteAnswer,
    getQuestionById
} = require("../lib/database");

async function handleCreateAnswer(req, res) {
    const { questionId } = req.params;
    const { body } = req.body;
    const userId = req.session.userId;

    try {
        const question = await getQuestionById(questionId);
        if (!question) {
            return res.status(404).render("error", {
                title: "Error - QnA",
                message: "Question not found"
            });
        }

        await createAnswer(questionId, userId, body);
        res.redirect(`/questions/${questionId}`);
    } catch (error) {
        res.render("error", {
            title: "Error - QnA",
            message: "Error posting answer"
        });
    }
}

async function handleUpdateAnswer(req, res) {
    const { answerId } = req.params;
    const { body } = req.body;
    const userId = req.session.userId;

    console.log(`[HANDLER] Processing answer update request for answer ID: ${answerId}`);
    console.log(`[HANDLER] User ID from session: ${userId}`);
    console.log(`[HANDLER] Request method: ${req.method}`);
    console.log(`[HANDLER] Request body:`, req.body);

    if (!body) {
        console.error(`[HANDLER] Missing answer body in update request`);
        return res.status(400).render("error", {
            title: "Error - QnA",
            message: "Answer body is required"
        });
    }

    try {
        console.log(`[HANDLER] Calling database updateAnswer function`);
        const success = await updateAnswer(answerId, userId, { body });
        
        if (!success) {
            console.error(`[HANDLER] Database update failed for answer: ${answerId}`);
            return res.status(403).render("error", {
                title: "Error - QnA",
                message: "You can only edit your own answers"
            });
        }

        // Redirect back to the question page
        console.log(`[HANDLER] Answer ${answerId} successfully updated`);
        const { questionId } = success;
        console.log(`[HANDLER] Redirecting to question: ${questionId}`);
        
        res.redirect(`/questions/${questionId}`);
    } catch (error) {
        console.error(`[HANDLER] Error updating answer: ${error.message}`, error);
        res.render("error", {
            title: "Error - QnA",
            message: "Error updating answer"
        });
    }
}

async function handleDeleteAnswer(req, res) {
    const { answerId } = req.params;
    const userId = req.session.userId;
    const { questionId: clientQuestionId } = req.body;
    
    try {
        console.log(`[SERVER] Deleting answer ${answerId} by user ${userId}`);
        console.log(`[SERVER] Client provided questionId: ${clientQuestionId}`);
        
        const result = await deleteAnswer(answerId, userId);
        if (!result) {
            return res.status(403).render("error", {
                title: "Error - QnA",
                message: "You can only delete your own answers"
            });
        }

        const redirectQuestionId = clientQuestionId || result.questionId;
        console.log(`[SERVER] Redirecting to question: ${redirectQuestionId}`);
        
        res.redirect(`/questions/${redirectQuestionId}`);
    } catch (error) {
        console.error('Error in handleDeleteAnswer:', error);
        res.render("error", {
            title: "Error - QnA",
            message: "Error deleting answer"
        });
    }
}

module.exports = {
    handleCreateAnswer,
    handleUpdateAnswer,
    handleDeleteAnswer
}; 