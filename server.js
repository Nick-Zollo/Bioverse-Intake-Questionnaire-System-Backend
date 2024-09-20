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
    }
});

const port = process.env.PORT || 3000;
app.listen(port, () => {
    console.log(`Server is up and listening on port ${port}`);
});

