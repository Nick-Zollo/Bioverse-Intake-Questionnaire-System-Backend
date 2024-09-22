const express = require("express");
const cors = require("cors");
const { createClient } = require('@supabase/supabase-js');
require("dotenv").config();

const app = express();

// Initialize Supabase client
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_KEY;
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
        const { data: junctionData, error: junctionError } = await supabase
            .from('questionnaire_junction')
            .select('question_id, priority')
            .eq('questionnaire_id', id)
            .order('priority');

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

    console.log('Incoming answers:', answers);

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

            if (existingError) {
                console.error('Error fetching existing answers:', existingError);
                throw existingError;
            }

            if (existingAnswer.length === 0) {
                const { data: insertData, error: insertError } = await supabase
                    .from('questionnaire_answers')
                    .insert([{ user_id: userId, question_id: questionId, answer: formattedAnswer }]);

                if (insertError) {
                    console.error('Insert error:', insertError);
                    throw insertError;
                }

                const { data: questionnaireIdData, error: questionnaireError } = await supabase
                    .from('questionnaire_junction')
                    .select('questionnaire_id')
                    .eq('question_id', questionId);

                if (questionnaireError) {
                    console.error('Error fetching questionnaire ID:', questionnaireError);
                    throw questionnaireError;
                }

                questionnaireIds.add(questionnaireIdData[0].questionnaire_id);
            } else {
                const { data: updateData, error: updateError } = await supabase
                    .from('questionnaire_answers')
                    .update({ answer: formattedAnswer })
                    .match({ user_id: userId, question_id: questionId });

                if (updateError) {
                    console.error('Update error:', updateError);
                    throw updateError;
                }
            }
        });

        await Promise.all(promises);

        for (const questionnaireId of questionnaireIds) {
            const completedCheckData = await supabase
                .from('questionnaire_answers')
                .select('*')
                .eq('user_id', userId)
                .in('question_id', 
                    await supabase
                        .from('questionnaire_junction')
                        .select('question_id')
                        .eq('questionnaire_id', questionnaireId)
                        .then(res => res.data.map(q => q.question_id))
                );

            const completedCount = completedCheckData.data.length;
            console.log('Completed Count for questionnaireId:', questionnaireId, 'is', completedCount);

            const totalQuestionsData = await supabase
                .from('questionnaire_junction')
                .select('*')
                .eq('questionnaire_id', questionnaireId);

            const totalQuestionCount = totalQuestionsData.data.length;
            console.log('Total Question Count for questionnaireId:', questionnaireId, 'is', totalQuestionCount);

            if (completedCount === totalQuestionCount) {
                console.log('All questions completed for questionnaire:', questionnaireId);

                const { data: userData, error: userFetchError } = await supabase
                    .from('users')
                    .select('completed_questionnaires')
                    .eq('id', userId)
                    .single();

                if (userFetchError) {
                    console.error('Error fetching user data:', userFetchError);
                    throw userFetchError;
                }

                const currentCompletedQuestionnaires = userData.completed_questionnaires;

                const { data: userUpdateData, error: userUpdateError } = await supabase
                    .from('users')
                    .update({ completed_questionnaires: currentCompletedQuestionnaires + 1 })
                    .eq('id', userId);

                if (userUpdateError) {
                    console.error('User update error:', userUpdateError);
                    throw userUpdateError;
                } else {
                    console.log('User update successful:', userUpdateData);
                }
            }
        }

        res.status(201).json({ status: "success", message: "Answers saved successfully." });
    } catch (err) {
        console.error('Error fetching data:', err);
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
        const { data, error } = await supabase.rpc('get_user_answers', { p_user_id: userId });

        if (error) throw error;

        res.status(200).json({
            status: "success",
            results: data.length,
            data: data,
        });
    } catch (err) {
        console.error('Error fetching data:', err);
        res.status(500).json({ message: 'Internal server error' });
    }
});

export default app;