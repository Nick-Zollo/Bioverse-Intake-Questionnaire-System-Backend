const express = require("express");
const cors = require("cors");
const db = require("./db");
require("dotenv").config();

const app = express();

// Use CORS middleware
app.use(cors());
app.use(express.json());

// Get all users
app.get("/users", async (req, res) => {
    try {
        const results = await db.query("SELECT * FROM users ORDER BY username;");
        res.status(200).json({
            status: "success",
            results: results.rows.length,
            data: {
                Users: results.rows,
            },
        });
    } catch (err) {
        console.log(err);
        res.status(500).json({ message: 'Internal server error' });
    }
});

// Get specific user
app.get("/users/:username", async (req, res) => {
    console.log(req.params.username);
    try {
        const results = await db.query("SELECT * FROM users WHERE username = $1", [req.params.username]);
        console.log(results.rows[0]);
        res.status(200).json({
            status: "success",
            results: results.rows.length,
            data: {
                Users: results.rows[0],
            },
        });
    } catch (err) {
        console.log(err);
        res.status(500).json({ message: 'Internal server error' });
    }
});

// Get all questions
app.get("/questions", async (req, res) => {
    try {
        const results = await db.query("SELECT * FROM questionnaire_questions;");
        console.log(results);
        res.status(200).json({
            status: "success",
            results: results.rows.length,
            data: {
                Users: results.rows,
            },
        });
    } catch (err) {
        console.log(err);
        res.status(500).json({ message: 'Internal server error' });
    }
});

// Get specific question
app.get("/questions/:id", async (req, res) => {
    console.log(req.params.id);
    try {
        const results = await db.query("SELECT * FROM questionnaire_questions WHERE id = $1", [req.params.id]);
        console.log(results.rows[0]);
        res.status(200).json({
            status: "success",
            results: results.rows.length,
            data: {
                Users: results.rows[0],
            },
        });
    } catch (err) {
        console.log(err);
        res.status(500).json({ message: 'Internal server error' });
    }
});

// Get all questionnaires
app.get("/questionnaires", async (req, res) => {
    try {
        const results = await db.query("SELECT * FROM questionnaire_questionnaires");
        res.status(200).json({
            status: "success",
            results: results.rows.length,
            data: {
                Questionnaires: results.rows, // Make sure you return the correct data structure
            },
        });
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Internal server error' });
    }
});

// Get questions by questionnaire ID
app.get("/questionnaire/:id", async (req, res) => {
    const { id } = req.params;
    try {
        const results = await db.query(`
            SELECT qq.id, qq.question 
            FROM questionnaire_junction qj
            JOIN questionnaire_questions qq ON qj.question_id = qq.id
            WHERE qj.questionnaire_id = $1
            ORDER BY qj.priority;
        `, [id]);

        res.status(200).json({
            status: "success",
            results: results.rows.length,
            data: {
                Questions: results.rows,
            },
        });
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Internal server error' });
    }
});

// User login
app.post('/login', async (req, res) => {
    const { username, password } = req.body;

    try {
        const results = await db.query("SELECT * FROM users WHERE username = $1 AND password = $2", [username, password]);

        if (results.rows.length > 0) {
            const user = results.rows[0];

            const responseData = {
                message: 'Login successful',
                userId: user.id,
                isAdmin: (user.username === 'admin' && user.password === 'admin')
            };

            res.status(200).json(responseData);
        } else {
            res.status(401).json({ message: 'Invalid credentials' });
        }
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Internal server error' });
    }
});

// Save user answers
app.post("/answers", async (req, res) => {
    const answers = req.body;

    try {
        const userId = answers[0].userId;
        const questionnaireIds = new Set();

        const promises = answers.map(async ({ userId, questionId, answer }) => {
            let formattedAnswer;

            if (Array.isArray(answer)) {
                formattedAnswer = JSON.stringify(answer);
            } else {
                formattedAnswer = answer.toString();
            }

            const existingAnswer = await db.query(`
                SELECT * FROM questionnaire_answers 
                WHERE user_id = $1 AND question_id = $2
            `, [userId, questionId]);

            if (existingAnswer.rows.length === 0) {
                await db.query(`
                    INSERT INTO questionnaire_answers (user_id, question_id, answer) 
                    VALUES ($1, $2, $3)
                `, [userId, questionId, formattedAnswer]);

                const questionnaireId = await db.query(`
                    SELECT questionnaire_id FROM questionnaire_junction 
                    WHERE question_id = $1
                `, [questionId]);

                questionnaireIds.add(questionnaireId.rows[0].questionnaire_id);
            } else {
                await db.query(`
                    UPDATE questionnaire_answers 
                    SET answer = $1 
                    WHERE user_id = $2 AND question_id = $3
                `, [formattedAnswer, userId, questionId]);
            }
        });

        await Promise.all(promises);

        for (const questionnaireId of questionnaireIds) {
            const completedCheck = await db.query(`
                SELECT COUNT(*) FROM questionnaire_answers 
                WHERE user_id = $1 AND question_id IN (
                    SELECT question_id FROM questionnaire_junction 
                    WHERE questionnaire_id = $2
                )
            `, [userId, questionnaireId]);

            const completedCount = parseInt(completedCheck.rows[0].count);
            console.log(`User ${userId} has completed ${completedCount} questions for questionnaire ${questionnaireId}`);

            const totalQuestions = await db.query(`
                SELECT COUNT(*) FROM questionnaire_junction 
                WHERE questionnaire_id = $1
            `, [questionnaireId]);

            const totalQuestionCount = parseInt(totalQuestions.rows[0].count);
            console.log(`Total questions in questionnaire ${questionnaireId}: ${totalQuestionCount}`);

            if (completedCount === totalQuestionCount) {
                await db.query(`
                    UPDATE users 
                    SET completed_questionnaires = completed_questionnaires + 1 
                    WHERE id = $1
                `, [userId]);

                console.log(`User ${userId} completed questionnaire ${questionnaireId}`);
            } else {
                console.log(`User ${userId} has not yet completed questionnaire ${questionnaireId}`);
            }
        }

        res.status(201).json({ status: "success", message: "Answers saved successfully." });
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Internal server error' });
    }
});





// Get all answers
app.get("/answers", async (req, res) => {
    try {
        const results = await db.query("SELECT * FROM questionnaire_answers");
        res.status(200).json({
            status: "success",
            results: results.rows.length,
            data: results.rows,
        });
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Internal server error' });
    }
});

// Get answers for a specific user, including question text
app.get("/answers/:userId", async (req, res) => {
    const userId = req.params.userId;

    try {
        const results = await db.query(`
            SELECT qa.question_id, qa.answer, qq.question 
            FROM questionnaire_answers qa
            JOIN questionnaire_questions qq ON qa.question_id = qq.id
            WHERE qa.user_id = $1
        `, [userId]);

        res.status(200).json({
            status: "success",
            results: results.rows.length,
            data: results.rows,
        });
    } catch (err) {
        console.log(err);
        res.status(500).json({ message: 'Internal server error' });
    }
});


const port = process.env.PORT || 3000;
app.listen(port, () => {
    console.log(`Server is up and listening on port ${port}`);
});
