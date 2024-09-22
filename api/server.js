const express = require("express");
const cors = require("cors");
const { createClient } = require('@supabase/supabase-js');
require("dotenv").config();

const app = express();

// Initialize Supabase client
const supabaseUrl = process.env.SUPABASE_URL || 'https://prtoqdzosfuissodapig.supabase.co'; // Ensure you set this in your .env
const supabaseKey = process.env.SUPABASE_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBydG9xZHpvc2Z1aXNzb2RhcGlnIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTcyNzAxMTczNiwiZXhwIjoyMDQyNTg3NzM2fQ.P6CKjDRxdqJ5375EMoiPBP9X0pX69qncMOwsF6Tzm_Q'; // Ensure you set this in your .env
const supabase = createClient(supabaseUrl, supabaseKey);

// Use CORS middleware
app.use(cors());
app.use(express.json());

// Get all users
app.get("/api/users", async (req, res) => {
    try {
        const { data, error } = await supabase
            .from('users')
            .select('*')
            .order('username');

        if (error) throw error;

        res.status(200).json({
            status: "success",
            results: data.length,
            data: {
                Users: data,
            },
        });
    } catch (err) {
        console.log(err);
        res.status(500).json({ message: 'Internal server error' });
    }
});

// Get specific user
app.get("/api/users/:username", async (req, res) => {
    try {
        const { data, error } = await supabase
            .from('users')
            .select('*')
            .eq('username', req.params.username);

        if (error) throw error;

        res.status(200).json({
            status: "success",
            results: data.length,
            data: {
                Users: data[0],
            },
        });
    } catch (err) {
        console.log(err);
        res.status(500).json({ message: 'Internal server error' });
    }
});

// Get all questions
app.get("/api/questions", async (req, res) => {
    try {
        const { data, error } = await supabase
            .from('questionnaire_questions')
            .select('*');

        if (error) throw error;

        res.status(200).json({
            status: "success",
            results: data.length,
            data: {
                Questions: data,
            },
        });
    } catch (err) {
        console.log(err);
        res.status(500).json({ message: 'Internal server error' });
    }
});

// Get specific question
app.get("/api/questions/:id", async (req, res) => {
    try {
        const { data, error } = await supabase
            .from('questionnaire_questions')
            .select('*')
            .eq('id', req.params.id);

        if (error) throw error;

        res.status(200).json({
            status: "success",
            results: data.length,
            data: {
                Question: data[0],
            },
        });
    } catch (err) {
        console.log(err);
        res.status(500).json({ message: 'Internal server error' });
    }
});

// Get all questionnaires
app.get("/api/questionnaires", async (req, res) => {
    try {
        const { data, error } = await supabase
            .from('questionnaire_questionnaires')
            .select('*');

        if (error) throw error;

        res.status(200).json({
            status: "success",
            results: data.length,
            data: {
                Questionnaires: data,
            },
        });
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Internal server error' });
    }
});

// Get questions by questionnaire ID
app.get("/api/questionnaire/:id", async (req, res) => {
    const { id } = req.params;
    try {
        // Fetch question IDs along with their priority
        const { data: junctionData, error: junctionError } = await supabase
            .from('questionnaire_junction')
            .select('question_id, priority')
            .eq('questionnaire_id', id)
            .order('priority'); // Order by priority here

        if (junctionError) throw junctionError;

        const questionIds = junctionData.map(q => q.question_id);
        const { data: questions, error: questionError } = await supabase
            .from('questionnaire_questions')
            .select('*')
            .in('id', questionIds);

        if (questionError) throw questionError;

        res.status(200).json({
            status: "success",
            results: questions.length,
            data: {
                Questions: questions,
            },
        });
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Internal server error' });
    }
});


// User login
app.post('/api/login', async (req, res) => {
    const { username, password } = req.body;

    try {
        const { data, error } = await supabase
            .from('users')
            .select('*')
            .eq('username', username)
            .eq('password', password);

        if (error) throw error;

        if (data.length > 0) {
            const user = data[0];

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
app.post("/api/answers", async (req, res) => {
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

            const { data: existingAnswer, error: existingError } = await supabase
                .from('questionnaire_answers')
                .select('*')
                .eq('user_id', userId)
                .eq('question_id', questionId);

            if (existingError) throw existingError;

            if (existingAnswer.length === 0) {
                await supabase
                    .from('questionnaire_answers')
                    .insert([{ user_id: userId, question_id: questionId, answer: formattedAnswer }]);

                const { data: questionnaireIdData, error: questionnaireError } = await supabase
                    .from('questionnaire_junction')
                    .select('questionnaire_id')
                    .eq('question_id', questionId);

                if (questionnaireError) throw questionnaireError;

                questionnaireIds.add(questionnaireIdData[0].questionnaire_id);
            } else {
                await supabase
                    .from('questionnaire_answers')
                    .update({ answer: formattedAnswer })
                    .match({ user_id: userId, question_id: questionId });
            }
        });

        await Promise.all(promises);

        for (const questionnaireId of questionnaireIds) {
            const { data: completedCheckData } = await supabase
                .from('questionnaire_answers')
                .select('count(*)')
                .eq('user_id', userId)
                .in('question_id', 
                    await supabase
                        .from('questionnaire_junction')
                        .select('question_id')
                        .eq('questionnaire_id', questionnaireId)
                        .then(res => res.data.map(q => q.question_id))
                );

            const completedCount = parseInt(completedCheckData[0].count);
            const { data: totalQuestionsData } = await supabase
                .from('questionnaire_junction')
                .select('count(*)')
                .eq('questionnaire_id', questionnaireId);

            const totalQuestionCount = parseInt(totalQuestionsData[0].count);

            if (completedCount === totalQuestionCount) {
                await supabase
                    .from('users')
                    .update({ completed_questionnaires: supabase.raw('completed_questionnaires + 1') })
                    .eq('id', userId);
            }
        }

        res.status(201).json({ status: "success", message: "Answers saved successfully." });
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Internal server error' });
    }
});

// Get all answers
app.get("/api/answers", async (req, res) => {
    try {
        const { data, error } = await supabase
            .from('questionnaire_answers')
            .select('*');

        if (error) throw error;

        res.status(200).json({
            status: "success",
            results: data.length,
            data: data,
        });
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Internal server error' });
    }
});

// Get answers for a specific user, including question text
app.get("/api/answers/:userId", async (req, res) => {
    const userId = req.params.userId;

    try {
        const { data, error } = await supabase
            .from('questionnaire_answers')
            .select('question_id, answer, questionnaire_questions.question')
            .join('questionnaire_questions', 'questionnaire_answers.question_id', 'questionnaire_questions.id')
            .eq('user_id', userId);

        if (error) throw error;

        res.status(200).json({
            status: "success",
            results: data.length,
            data: data,
        });
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Internal server error' });
    }
});

export default app;
