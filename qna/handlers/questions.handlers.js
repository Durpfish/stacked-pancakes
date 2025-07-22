const {
    createQuestion,
    getQuestions,
    getQuestionById,
    updateQuestion,
    deleteQuestion,
    getAnswers,
    getUserById,
    getQuestion
} = require("../lib/database");

async function handleCreateQuestion(req, res) {
    try {
        const { title, body, tags } = req.body;
        
        if (!title || !body || !tags) {
            return res.render('error', {
                message: 'Title, body, and tags are required fields'
            });
        }

        const tagArray = tags.split(',')
            .map(tag => tag.trim().toLowerCase())
            .filter(tag => tag.length > 0);

        if (tagArray.length === 0) {
            return res.render('error', {
                message: 'At least one tag is required'
            });
        }

        if (tagArray.length > 5) {
            return res.render('error', {
                message: 'Maximum 5 tags allowed'
            });
        }

        // validate tag format
        const tagRegex = /^[a-z0-9-]+$/;
        if (!tagArray.every(tag => tagRegex.test(tag))) {
            return res.render('error', {
                message: 'Tags can only contain letters, numbers, and hyphens'
            });
        }

        const questionId = await createQuestion(req.session.userId, title, body, tagArray);
        res.redirect('/questions?success=Question created successfully!');
    } catch (error) {
        console.error('Error creating question:', error);
        // Redirect to questions list with an error message instead of showing error page
        res.redirect('/questions?error=Failed to create question. Please try again.');
    }
}

async function handleListQuestions(req, res) {
    const page = parseInt(req.query.page) || 1;
    const sort = req.query.sort || "newest";
    const tag = req.query.tag;
    const query = req.query.q;
    const userId = req.query.userId;

    let sortQuery = {};
    switch (sort) {
        case "votes":
            sortQuery = { createdAt: -1 }; // Default sort 
            break;
        default:
            sortQuery = { createdAt: -1 };
    }

    let filter = {};
    // tag filter if provided
    if (tag) {
        filter.tags = tag;
    }
    
    // search filter if provided
    if (query && query.trim()) {
        const searchRegex = new RegExp(query.trim(), 'i'); // case-insensitive search
        filter.$or = [
            { title: searchRegex },        // Search in title
            { body: searchRegex },         // Search in body
            { tags: searchRegex }          // Search in tags
        ];
    }
    
    // userId filter if provided (for "My Questions")
    if (userId) {
        filter.userId = userId;
    }

    try {
        const result = await getQuestions(filter, sortQuery, page);
        
        const questionsPromises = result.questions.map(async (question) => {
            const author = await getUserById(question.userId);
            
            const answers = await getAnswers(question._id);
            const answerCount = answers ? answers.length : 0;

            const upVotes = question.votes?.up?.length || 0;
            const downVotes = question.votes?.down?.length || 0;
            const netVotes = upVotes - downVotes;

            return {
                ...question,
                answerCount,
                netVotes,
                author: author ? {
                    username: author.username,
                    profilePicture: author.profilePicture
                } : null
            };
        });
        
        let questionsWithAuthors = await Promise.all(questionsPromises);
        
        if (sort === "votes") {
            questionsWithAuthors.sort((a, b) => b.netVotes - a.netVotes);
        }

        let title = "Questions - QnA";
        if (query) {
            title = `Search: ${query} - QnA`;
        } else if (userId && userId === req.session.userId) {
            title = "My Questions - QnA";
        } else if (tag) {
            title = `Questions tagged '${tag}' - QnA`;
        }

        res.render("questions/list", {
            title: title,
            layout: 'layout',
            questions: questionsWithAuthors,
            currentPage: result.currentPage,
            totalPages: Math.ceil(result.total / 10),
            sort,
            tag,
            query,
            isMyQuestions: userId && userId === req.session.userId,
            error: req.query.error, // Pass error message from query parameter
            success: req.query.success // Pass success message from query parameter
        });
    } catch (error) {
        console.error('Error loading questions:', error);
        res.render("error", {
            title: "Error - QnA",
            message: "Error loading questions"
        });
    }
}

async function handleViewQuestion(req, res) {
    const { id } = req.params;
    const userId = req.session.userId;
    
    try {
        const question = await getQuestionById(id);
        if (!question) {
            return res.status(404).render("error", {
                title: "Error - QnA",
                message: "Question not found"
            });
        }

        const author = await getUserById(question.userId);
        if (!author) {
            return res.status(404).render("error", {
                title: "Error - QnA",
                message: "Question author not found"
            });
        }

        const answers = await getAnswers(id);
        
        const answersWithAuthors = await Promise.all(
            answers.map(async (answer) => {
                const answerAuthor = await getUserById(answer.userId);
                return {
                    ...answer,
                    author: answerAuthor ? {
                        username: answerAuthor.username,
                        profilePicture: answerAuthor.profilePicture
                    } : {
                        username: "Unknown User",
                        profilePicture: "/assets/images/default-avatar.png"
                    }
                };
            })
        );

        // determine if current user is the author
        const isAuthor = userId && question.userId.toString() === userId.toString();
        console.log(`[VIEW] Is current user the author? ${isAuthor} (User: ${userId}, Author: ${question.userId})`);

        res.render("questions/view", {
            title: `${question.title} - QnA`,
            layout: 'layout',
            question: {
                ...question,
                author: {
                    username: author.username,
                    profilePicture: author.profilePicture
                }
            },
            answers: answersWithAuthors,
            isAuthor: isAuthor
        });
    } catch (error) {
        console.error("[VIEW] Error loading question:", error);
        res.render("error", {
            title: "Error - QnA",
            message: "Error loading question"
        });
    }
}

async function handleEditQuestion(req, res) {
    const { id } = req.params;
    const userId = req.session.userId;
    
    try {
        const question = await getQuestionById(id);
        if (!question) {
            return res.status(404).render("error", {
                title: "Error - QnA",
                message: "Question not found"
            });
        }

        if (question.userId !== userId) {
            return res.status(403).render("error", {
                title: "Error - QnA",
                message: "You can only edit your own questions"
            });
        }

        res.render("questions/edit", {
            title: "Edit Question - QnA",
            layout: 'layout',
            question
        });
    } catch (error) {
        res.render("error", {
            title: "Error - QnA",
            message: "Error loading question"
        });
    }
}

async function handleUpdateQuestion(req, res) {
    const { id } = req.params;
    const userId = req.session.userId;
    const { title, body, tags } = req.body;

    try {
        const processedTags = tags && typeof tags === 'string' 
            ? tags.split(',').map(tag => tag.trim()).filter(tag => tag)
            : [];

        const success = await updateQuestion(id, userId, {
            title,
            body,
            tags: processedTags
        });

        if (!success) {
            return res.render("questions/edit", {
                title: "Edit Question - QnA",
                layout: 'layout',
                error: "You can only edit your own questions",
                question: { 
                    _id: id, 
                    title, 
                    body, 
                    tags: processedTags
                }
            });
        }

        res.redirect(`/questions/${id}`);
    } catch (error) {
        console.error("Error updating question:", error);
        res.render("questions/edit", {
            title: "Edit Question - QnA",
            layout: 'layout',
            error: "Error updating question",
            question: { 
                _id: id, 
                title, 
                body, 
                tags: tags && typeof tags === 'string' 
                    ? tags.split(',').map(tag => tag.trim()).filter(tag => tag) 
                    : []
            }
        });
    }
}

async function handleDeleteQuestion(req, res) {
    const { id } = req.params;
    const userId = req.session.userId;
    const isDeleteOverride = req.isDeleteOverride;

    try {
        console.log(`[HANDLER] Attempting to delete question ${id} by user ${userId}`);
        
        if (!userId) {
            console.log(`[HANDLER] User not authenticated for delete operation`);
            return res.status(401).render("error", {
                title: "Error - QnA",
                message: "You must be logged in to delete questions."
            });
        }
        
        const questionIdStr = String(id);
        const userIdStr = String(userId);
        
        const question = await getQuestionById(questionIdStr);
        
        if (!question) {
            console.log(`[HANDLER] Question ${id} not found`);
            if (isDeleteOverride) {
                console.log(`[HANDLER] Using delete override, redirecting to questions list`);
                return res.redirect("/questions?success=Question deleted successfully!");
            }
            return res.status(404).render("error", {
                title: "Error - QnA",
                message: "Question not found"
            });
        }
        
        const isAuthor = question.userId.toString() === userIdStr;
        console.log(`[HANDLER] Is user the author? ${isAuthor}`);
        
        if (!isAuthor) {
            console.log(`[HANDLER] User ${userIdStr} is not authorized to delete question ${questionIdStr}`);
            return res.status(403).render("error", {
                title: "Error - QnA",
                message: "You can only delete your own questions."
            });
        }
        
        console.log(`[HANDLER] Calling deleteQuestion with questionId: ${questionIdStr}, userId: ${userIdStr}`);
        const success = await deleteQuestion(questionIdStr, userIdStr);
        

        const checkQuestion = await getQuestionById(questionIdStr);
        if (!checkQuestion) {
            console.log(`[HANDLER] Question ${id} was successfully deleted (verified)`);
            console.log(`[HANDLER] Redirecting to /questions after successful deletion`);
            return res.redirect("/questions?success=Question deleted successfully!");
        }
        
        if (!success) {
            console.log(`[HANDLER] Failed to delete question ${id}`);
            return res.status(500).render("error", {
                title: "Error - QnA",
                message: "Failed to delete question. Please try again."
            });
        }
        
        console.log(`[HANDLER] Successfully deleted question ${id}`);
        

        console.log(`[HANDLER] Redirecting to /questions after successful deletion`);
        return res.redirect("/questions?success=Question deleted successfully!");
        
    } catch (error) {
        console.error('[HANDLER] Error deleting question:', error);
        if (isDeleteOverride) {
            console.log(`[HANDLER] Error during delete, but using override, redirecting to questions list`);
            return res.redirect("/questions?success=Question deleted successfully!");
        }
        return res.status(500).render("error", {
            title: "Error - QnA",
            message: "An error occurred while deleting the question. Please try again."
        });
    }
}

function handleNewQuestionPage(req, res) {
    res.render("questions/new", {
        title: "Ask Question - QnA",
        layout: 'layout'
    });
}

module.exports = {
    handleCreateQuestion,
    handleListQuestions,
    handleViewQuestion,
    handleEditQuestion,
    handleUpdateQuestion,
    handleDeleteQuestion,
    handleNewQuestionPage
}; 