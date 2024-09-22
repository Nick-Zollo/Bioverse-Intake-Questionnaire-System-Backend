const db = require("./db")
require("dotenv").config();
const express = require("express")

const app = express()

app.use(express.json());

//Get all users
app.get("/users", async (req, res) => {
    try{
        const results = await db.query("SELECT * FROM users;")
        console.log(results)
        res.status(200).json({
            status: "success",
            results: results.rows.length,
            data: {
                Users: results.rows,
            },
        });
    }
    catch (err) {
        console.log(err)
        res.status(500).json({ message: 'Internal server error' });
    }
});

//Get specific user
app.get("/users/:username", async (req, res) => {
    console.log(req.params.username);
    try{
        const results = await db.query("SELECT * FROM users WHERE username = $1", [req.params.username]);
        console.log(results.rows[0])
        res.status(200).json({
            status: "success",
            results: results.rows.length,
            data: {
                Users: results.rows[0],
            },
        });
    }
    catch (err) {
        console.log(err)
        res.status(500).json({ message: 'Internal server error' });
    }
});

//Get all questions
app.get("/questions", async (req, res) => {
    try{
        const results = await db.query("SELECT * FROM questionnaire_questions;")
        console.log(results)
        res.status(200).json({
            status: "success",
            results: results.rows.length,
            data: {
                Users: results.rows,
            },
        });
    }
    catch (err) {
        console.log(err)
        res.status(500).json({ message: 'Internal server error' });
    }
});

//Get specific question
app.get("/questions/:id", async (req, res) => {
    console.log(req.params.id);
    try{
        const results = await db.query("SELECT * FROM questionnaire_questions WHERE id = $1", [req.params.id]);
        console.log(results.rows[0])
        res.status(200).json({
            status: "success",
            results: results.rows.length,
            data: {
                Users: results.rows[0],
            },
        });
    }
    catch (err) {
        console.log(err)
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
        const promises = answers.map(({ userId, questionId, answer, questionnaireId }) => 
            db.query(`INSERT INTO questionnaire_answers (user_id, question_id, answer, questionnaire_id) VALUES ($1, $2, $3, $4)`, [userId, questionId, answer, questionnaireId])
        );

        await Promise.all(promises);

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
            data: {
                Answers: results.rows,
            },
        });
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Internal server error' });
    }
});


const port = process.env.PORT || 3000;
app.listen(port, () => {
    console.log(`Server is up and listening on port ${port}`);
});
