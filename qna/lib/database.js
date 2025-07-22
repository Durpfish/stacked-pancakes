const { MongoClient, ObjectId } = require("mongodb");
let client = null;

let collectionUsers = null;
let collectionQuestions = null;
let collectionAnswers = null;
let collectionVotes = null;

async function initDBIfNecessary() {
    if (!client) {
        const uri = process.env.MONGODB_URI || "mongodb://localhost:27017";
        client = await MongoClient.connect(uri);
        const db = client.db("qna");
        
        collectionUsers = db.collection("users");
        collectionQuestions = db.collection("questions");
        collectionAnswers = db.collection("answers");
        collectionVotes = db.collection("votes");
    }
} 

async function disconnect() {
    if (client) {
        await client.close();
        client = null;
    }
} 

// User Methods
async function createUser(username, email, password, bio = "", profilePicture = "/assets/images/default-avatar.png") {
    await initDBIfNecessary();
    const user = {
        username,
        email,
        password, 
        bio,
        profilePicture,
        createdAt: new Date()
    };
    const result = await collectionUsers.insertOne(user);
    return result.insertedId;
}

async function getUserByUsername(username) {
    await initDBIfNecessary();
    return collectionUsers.findOne({ username });
}

async function getUserById(userId) {
    await initDBIfNecessary();
    try {
        return collectionUsers.findOne({ _id: new ObjectId(userId) });
    } catch (error) {
        console.error('Error converting userId to ObjectId:', error);
        return null;
    }
}

async function updateUser(userId, updates) {
    await initDBIfNecessary();
    try {
        const result = await collectionUsers.updateOne(
            { _id: new ObjectId(userId) },
            { $set: updates }
        );
        return result.modifiedCount > 0;
    } catch (error) {
        console.error('Error updating user:', error);
        return false;
    }
}

// Question Methods
async function createQuestion(userId, title, body, tags) {
    await initDBIfNecessary();
    const question = {
        userId,
        title,
        body,
        tags,
        createdAt: new Date(),
        updatedAt: new Date(),
        votes: {
            up: [],
            down: []
        }
    };
    const result = await collectionQuestions.insertOne(question);
    return result.insertedId;
}

async function getQuestions(filter = {}, sort = { createdAt: -1 }, page = 1, limit = 10) {
    await initDBIfNecessary();
    const skip = (page - 1) * limit;
    
    const questions = await collectionQuestions
        .find(filter)
        .sort(sort)
        .skip(skip)
        .limit(limit)
        .toArray();
        
    const total = await collectionQuestions.countDocuments(filter);
    
    return {
        questions,
        total,
        currentPage: page,
        totalPages: Math.ceil(total / limit)
    };
}

async function getQuestionById(questionId) {
    await initDBIfNecessary();
    try {
        return collectionQuestions.findOne({ _id: new ObjectId(questionId) });
    } catch (error) {
        console.error('Error converting questionId to ObjectId:', error);
        return null;
    }
}

async function updateQuestion(questionId, userId, updates) {
    await initDBIfNecessary();
    try {
        const question = await getQuestionById(questionId);
        
        if (!question) {
            console.error('Question not found:', questionId);
            return false;
        }

        if (question.userId.toString() !== userId.toString()) {
            console.error('User does not own this question');
            return false;
        }
        
        const result = await collectionQuestions.updateOne(
            { _id: new ObjectId(questionId) },
            { 
                $set: {
                    ...updates,
                    updatedAt: new Date()
                }
            }
        );
        return result.modifiedCount > 0;
    } catch (error) {
        console.error('Error updating question:', error);
        return false;
    }
}

async function deleteQuestion(questionId, userId) {
    await initDBIfNecessary();
    try {
        console.log(`[DEBUG] Starting deletion of question ${questionId} by user ${userId}`);
        
        const questionIdStr = String(questionId);
        const userIdStr = String(userId);
        
        console.log(`[DEBUG] Converted IDs to strings: questionId=${questionIdStr}, userId=${userIdStr}`);

        let questionObjectId;
        let userObjectId;
        
        try {
            questionObjectId = new ObjectId(questionIdStr);
            console.log(`[DEBUG] Successfully created question ObjectId: ${questionObjectId}`);
        } catch (error) {
            console.error(`[DEBUG] Failed to create ObjectId from questionId: ${questionIdStr}`, error);
            return false;
        }
        
        try {
            userObjectId = new ObjectId(userIdStr);
            console.log(`[DEBUG] Successfully created user ObjectId: ${userObjectId}`);
        } catch (error) {
            console.error(`[DEBUG] Failed to create ObjectId from userId: ${userIdStr}`, error);
            return false;
        }
        
        console.log(`[DEBUG] Searching for question with ObjectId: ${questionObjectId}`);
        const question = await collectionQuestions.findOne({ _id: questionObjectId });
        
        if (!question) {
            console.error(`[DEBUG] Question ${questionIdStr} not found`);
            return false;
        }
        
        console.log(`[DEBUG] Found question with title: "${question.title}"`);
        
        if (question.userId.toString() !== userObjectId.toString()) {
            console.error(`[DEBUG] User ${userIdStr} does not own question ${questionIdStr}`);
            console.log(`[DEBUG] Question owner: ${question.userId.toString()}, User ID: ${userObjectId.toString()}`);
            
            console.log(`[DEBUG] Question owner type: ${typeof question.userId}, User ID type: ${typeof userObjectId}`);
            console.log(`[DEBUG] Direct comparison (userId === userObjectId): ${question.userId === userObjectId}`);
            console.log(`[DEBUG] String comparison (userId.toString() === userObjectId.toString()): ${question.userId.toString() === userObjectId.toString()}`);
            
            return false;
        }
        
        console.log(`[DEBUG] User authorized to delete question, proceeding with deletion`);
        console.log(`[DEBUG] Executing findOneAndDelete for question ${questionObjectId}`);
        const result = await collectionQuestions.findOneAndDelete({ _id: questionObjectId });
        
        console.log(`[DEBUG] Delete operation result:`, JSON.stringify(result));

        if (result && result.value) {
            console.log(`[DEBUG] MongoDB reported successful deletion of question`);
            
            const checkQuestion = await collectionQuestions.findOne({ _id: questionObjectId });
            if (checkQuestion) {
                console.error(`[DEBUG] WARNING: Question ${questionIdStr} still exists after deletion!`);
                console.log(`[DEBUG] Question data after failed deletion:`, JSON.stringify(checkQuestion));
                
                console.log(`[DEBUG] Attempting stronger deletion approach...`);
                await collectionQuestions.deleteMany({ _id: questionObjectId });
                
                const recheckQuestion = await collectionQuestions.findOne({ _id: questionObjectId });
                if (recheckQuestion) {
                    console.error(`[DEBUG] CRITICAL: Question could not be deleted after multiple attempts!`);
                    return false;
                }
            }
            
            // get all answers for this question before deleting them
            console.log(`[DEBUG] Finding answers for question ${questionObjectId}`);
            const answers = await collectionAnswers.find({ 
                questionId: questionObjectId 
            }).toArray();
            
            const answerIds = answers.map(answer => answer._id);
            console.log(`[DEBUG] Found ${answers.length} answers for this question`);
            
            // delete related answers
            console.log(`[DEBUG] Deleting ${answers.length} answers for question ${questionIdStr}`);
            await collectionAnswers.deleteMany({ 
                questionId: questionObjectId 
            });
            
            // delete votes related to the question
            console.log(`[DEBUG] Deleting votes for question ${questionIdStr}`);
            await collectionVotes.deleteMany({ 
                questionId: questionObjectId 
            });
            
            // delete votes related to any of the answers
            if (answerIds.length > 0) {
                console.log(`[DEBUG] Deleting votes for ${answerIds.length} answers`);
                await collectionVotes.deleteMany({
                    answerId: { $in: answerIds }
                });
            }
            
            const remainingAnswers = await collectionAnswers.countDocuments({ 
                questionId: questionObjectId 
            });
            
            const remainingQuestionVotes = await collectionVotes.countDocuments({ 
                questionId: questionObjectId 
            });
            
            if (remainingAnswers > 0 || remainingQuestionVotes > 0) {
                console.error(`[DEBUG] Warning: Some related data was not deleted. Remaining answers: ${remainingAnswers}, remaining votes: ${remainingQuestionVotes}`);
            } else {
                console.log(`[DEBUG] Successfully deleted all related data for question ${questionIdStr}`);
            }
            
            const finalCheck = await collectionQuestions.findOne({ _id: questionObjectId });
            if (finalCheck) {
                console.error(`[DEBUG] FINAL CHECK FAILED: Question ${questionIdStr} still exists after all deletion attempts`);
                return false;
            } else {
                console.log(`[DEBUG] FINAL CHECK PASSED: Question ${questionIdStr} successfully deleted`);
            }
            
            return true;
        } else {
            console.error(`[DEBUG] MongoDB reported question not found or not deleted`);
            return false;
        }
    } catch (error) {
        console.error('[DEBUG] Error deleting question:', error);
        return false;
    }
}

// Answer Methods
async function createAnswer(questionId, userId, body) {
    await initDBIfNecessary();
    const answer = {
        questionId: new ObjectId(questionId),
        userId: new ObjectId(userId),
        body,
        createdAt: new Date(),
        updatedAt: new Date(),
        votes: {
            up: [],
            down: []
        }
    };
    const result = await collectionAnswers.insertOne(answer);
    return result.insertedId;
}

async function getAnswers(questionId, sort = { createdAt: -1 }) {
    await initDBIfNecessary();
    try {
        return collectionAnswers
            .find({ questionId: new ObjectId(questionId) })
            .sort(sort)
            .toArray();
    } catch (error) {
        console.error('Error getting answers:', error);
        return [];
    }
}

async function updateAnswer(answerId, userId, updates) {
    await initDBIfNecessary();
    try {
        const answer = await collectionAnswers.findOne({
            _id: new ObjectId(answerId),
            userId: new ObjectId(userId)
        });
        
        if (!answer) {
            return false;
        }
        
        const result = await collectionAnswers.updateOne(
            { 
                _id: new ObjectId(answerId),
                userId: new ObjectId(userId)
            },
            { 
                $set: {
                    ...updates,
                    updatedAt: new Date()
                }
            }
        );
        
        if (result.modifiedCount > 0) {
            return {
                success: true,
                questionId: answer.questionId.toString()
            };
        }
        return false;
    } catch (error) {
        console.error('Error updating answer:', error);
        return false;
    }
}

async function deleteAnswer(answerId, userId) {
    await initDBIfNecessary();
    try {
        const answer = await collectionAnswers.findOne({
            _id: new ObjectId(answerId),
            userId: new ObjectId(userId)
        });
        
        if (!answer) {
            console.log(`[DB] Answer not found or not owned by user ${userId}`);
            return false;
        }
        
        const questionId = answer.questionId.toString();
        console.log(`[DB] Found answer with questionId: ${questionId}`);
        
        const result = await collectionAnswers.deleteOne({
            _id: new ObjectId(answerId),
            userId: new ObjectId(userId)
        });
        
        if (result.deletedCount > 0) {
            console.log(`[DB] Successfully deleted answer ${answerId}`);
            // clean up votes for this answer
            await collectionVotes.deleteMany({ answerId: new ObjectId(answerId) });
            return {
                success: true,
                questionId: questionId
            };
        }
        console.log(`[DB] Delete operation failed for answer ${answerId}`);
        return false;
    } catch (error) {
        console.error('Error deleting answer:', error);
        return false;
    }
}

async function getAnswerById(answerId) {
    await initDBIfNecessary();
    try {
        return collectionAnswers.findOne({ _id: new ObjectId(answerId) });
    } catch (error) {
        console.error('Error converting answerId to ObjectId:', error);
        return null;
    }
}

// Vote Methods
async function voteQuestion(questionId, userId, voteType) {
    await initDBIfNecessary();
    try {
        const objectId = new ObjectId(questionId);
        const userObjectId = new ObjectId(userId);
        
        const question = await collectionQuestions.findOne({ _id: objectId });
        if (!question) return false;

        await collectionQuestions.updateOne(
            { _id: objectId },
            { 
                $pull: {
                    'votes.up': userObjectId,
                    'votes.down': userObjectId
                }
            }
        );

        if (voteType !== null) {
            await collectionQuestions.updateOne(
                { _id: objectId },
                { $push: { [`votes.${voteType}`]: userObjectId } }
            );
        }

        return true;
    } catch (error) {
        console.error('Error voting on question:', error);
        return false;
    }
}

async function voteAnswer(answerId, userId, voteType) {
    await initDBIfNecessary();
    try {
        const objectId = new ObjectId(answerId);
        const userObjectId = new ObjectId(userId);
        
        const answer = await collectionAnswers.findOne({ _id: objectId });
        if (!answer) return false;

        await collectionAnswers.updateOne(
            { _id: objectId },
            { 
                $pull: {
                    'votes.up': userObjectId,
                    'votes.down': userObjectId
                }
            }
        );

        if (voteType !== null) {
            await collectionAnswers.updateOne(
                { _id: objectId },
                { $push: { [`votes.${voteType}`]: userObjectId } }
            );
        }

        return true;
    } catch (error) {
        console.error('Error voting on answer:', error);
        return false;
    }
}

async function getUserVote(userId, questionId, answerId) {
    await initDBIfNecessary();
    try {
        const filter = { userId: new ObjectId(userId) };
        
        if (questionId) {
            filter.questionId = new ObjectId(questionId);
        }
        
        if (answerId) {
            filter.answerId = new ObjectId(answerId);
        }
        
        const vote = await collectionVotes.findOne(filter);
        return vote ? vote.voteType : null;
    } catch (error) {
        console.error('Error getting user vote:', error);
        return null;
    }
}

module.exports = {
    initDBIfNecessary,
    disconnect,
    // User methods
    createUser,
    getUserByUsername,
    getUserById,
    updateUser,
    // Question methods
    createQuestion,
    getQuestions,
    getQuestionById,
    updateQuestion,
    deleteQuestion,
    // Answer methods
    createAnswer,
    getAnswers,
    updateAnswer,
    deleteAnswer,
    getAnswerById,
    // Vote methods
    voteQuestion,
    voteAnswer,
    getUserVote,
    // Utils
    ObjectId
};
