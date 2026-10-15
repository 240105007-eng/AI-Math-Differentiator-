
require("dotenv").config();

const express = require("express");
const Groq = require("groq-sdk");
const path = require("path");

const app = express();
const PORT = process.env.PORT || 3000;
const MODEL = "openai/gpt-oss-20b";

app.use(express.json({ limit: "10kb" }));

// Open the website
app.get("/", (req, res) => {
    res.sendFile(path.join(__dirname, "index.html"));
});

// Check the difficulty level
function validLevel(level) {
    return ["foundation", "standard", "advanced"].includes(level);
}

// Connect to Groq
function groqClient() {
    if (!process.env.GROQ_API_KEY) {
        throw new Error("GROQ_API_KEY is missing");
    }

    return new Groq({
        apiKey: process.env.GROQ_API_KEY
    });
}

// Handle Groq errors
function errorMessage(error) {
    console.error("Groq error status:", error.status);
    console.error("Groq error message:", error.message);

    if (error.status === 401) {
        return "Invalid Groq API key.";
    }

    if (error.status === 404) {
        return "Groq model not found or unavailable.";
    }

    if (error.status === 429) {
        return "Groq rate limit reached. Try again later.";
    }

    return "AI request failed. Check the server logs.";
}

// =====================================
// FEATURE 1: ASK AI
// =====================================

app.post("/api/ai", async (req, res) => {
    try {
        const { level, question } = req.body || {};

        if (
            !validLevel(level) ||
            typeof question !== "string" ||
            !question.trim() ||
            question.length > 500
        ) {
            return res.status(400).json({
                error: "Invalid level or question."
            });
        }

        const completion = await groqClient()
            .chat.completions.create({
                model: MODEL,
                messages: [
                    {
                        role: "system",
                        content:
                            "You are a patient mathematics tutor. " +
                            "Explain quadratic equations step by step " +
                            "in simple English. " +
                            "Adapt the explanation to the student's level. " +
                            "Check your calculations carefully."
                    },
                    {
                        role: "user",
                        content:
                            "Level: " + level +
                            "\nEquation: " + question +
                            "\nExplain how to solve it step by step."
                    }
                ],
                temperature: 0.2,
                max_completion_tokens: 900
            });

        const answer =
            completion.choices?.[0]?.message?.content;

        if (!answer) {
            return res.status(502).json({
                error: "Groq returned no explanation."
            });
        }

        res.json({ answer });

    } catch (error) {
        res.status(502).json({
            error: errorMessage(error)
        });
    }
});

// =====================================
// MATHEMATICAL HELPER FUNCTIONS
// =====================================

function signedTerm(number, variable) {
    if (number === 0) return "";

    const sign = number > 0 ? " + " : " - ";
    const amount = Math.abs(number);

    return sign +
        (variable && amount === 1 ? "" : amount) +
        variable;
}

function formatEquation(a, b, c) {
    return (a === 1 ? "" : a) + "x²" +
        signedTerm(b, "x") +
        signedTerm(c, "") +
        " = 0";
}

function fraction(numerator, denominator) {
    function gcd(a, b) {
        a = Math.abs(a);
        b = Math.abs(b);

        while (b !== 0) {
            [a, b] = [b, a % b];
        }

        return a;
    }

    const d = gcd(numerator, denominator);

    if (denominator / d === 1) {
        return String(numerator / d);
    }

    return (numerator / d) +
        "/" +
        (denominator / d);
}

// Build a mathematically correct problem
function makeProblem(level, values) {
    if (!values || typeof values !== "object") {
        throw new Error("Invalid AI output");
    }

    const { p, q, r, s } = values;

    if (![p, q, r, s].every(Number.isInteger)) {
        throw new Error("AI must return integers");
    }

    if (q === 0 || s === 0 || q * r === s * p) {
        throw new Error("Choose two distinct nonzero roots");
    }

    if (level === "foundation") {
        if (
            p !== 1 ||
            r !== 1 ||
            q < 1 || q > 9 ||
            s < 1 || s > 9
        ) {
            throw new Error("Invalid foundation factors");
        }

    } else if (level === "standard") {
        if (
            p < 2 || p > 5 ||
            r !== 1 ||
            q < -9 || q > 9 ||
            s < -9 || s > 9
        ) {
            throw new Error("Invalid standard factors");
        }

    } else {
        if (
            p < 2 || p > 5 ||
            r < 2 || r > 5 ||
            q < -9 || q > 9 ||
            s < -9 || s > 9
        ) {
            throw new Error("Invalid advanced factors");
        }
    }

    // Equation: (p*x - q)(r*x - s) = 0

    const a = p * r;
    const b = -(p * s + q * r);
    const c = q * s;

    const root1 = q / p;
    const root2 = s / r;

    const factor1 =
        "(" + p + "x " +
        (q >= 0 ? "- " + q : "+ " + (-q)) +
        ")";

    const factor2 =
        "(" + r + "x " +
        (s >= 0 ? "- " + s : "+ " + (-s)) +
        ")";

    return {
        question: formatEquation(a, b, c),
        answers: [root1, root2],
        hint:
            "Try factoring the quadratic into two brackets, " +
            "or use the quadratic formula.",
        solution:
            "Factorise:\n" +
            factor1 + factor2 + " = 0\n" +
            "Set each bracket equal to zero.\n" +
            "x = " + fraction(q, p) +
            " or x = " + fraction(s, r)
    };
}

// =====================================
// FEATURE 2: AI QUESTION GENERATOR
// =====================================

app.post("/api/generate", async (req, res) => {
    try {
        const { level } = req.body || {};

        if (!validLevel(level)) {
            return res.status(400).json({
                error: "Choose a valid difficulty level."
            });
        }

        const rules = {
            foundation:
                "p=1, r=1, q and s are DIFFERENT " +
                "integers from 1 to 9.",

            standard:
                "p is an integer from 2 to 5, r=1, " +
                "q and s are nonzero integers from -9 to 9. " +
                "Roots must differ.",

            advanced:
                "p and r are integers from 2 to 5, " +
                "q and s are nonzero integers from -9 to 9. " +
                "Roots q/p and s/r must differ."
        };

        let problem;
        let lastError;

        // Try up to three times
        for (let attempt = 1; attempt <= 3; attempt++) {
            try {
                const completion = await groqClient()
                    .chat.completions.create({
                        model: MODEL,
                        messages: [
                            {
                                role: "system",
                                content:
                                    "Create a quadratic equation using " +
                                    "factors (p*x-q)(r*x-s)=0. " +
                                    "Return a JSON object with exactly " +
                                    "four integer keys: p, q, r, s. " +
                                    "No explanation. " +
                                    "Follow all mathematical rules."
                            },
                            {
                                role: "user",
                                content:
                                    "Generate a " + level +
                                    " level quadratic question. " +
                                    rules[level] +
                                    " Return JSON containing p, q, r, s. " +
                                    "Use varied values and distinct roots."
                            }
                        ],
                        response_format: {
                            type: "json_object"
                        },
                        temperature: 0.6,
                        max_completion_tokens: 1200
                    });

                const content =
                    completion.choices?.[0]?.message?.content;

                if (!content || !content.trim()) {
                    throw new Error("Groq returned an empty answer");
                }

                const values = JSON.parse(content);

                problem = makeProblem(level, values);
                break;

            } catch (error) {
                if (error.status) {
                    throw error;
                }

                lastError = error;

                console.log(
                    "Generation attempt " + attempt +
                    " failed: " + error.message
                );
            }
        }

        if (!problem) {
            throw lastError ||
                new Error("No valid problem generated");
        }

        res.json({ problem });

    } catch (error) {
        if (error.status) {
            return res.status(502).json({
                error: errorMessage(error)
            });
        }

        console.error(
            "Question generation error:",
            error.message
        );

        res.status(502).json({
            error:
                "Could not generate a valid question. Please try again."
        });
    }
});

// =====================================
// START SERVER FOR RENDER
// =====================================

app.listen(PORT, "0.0.0.0", () => {
    console.log("AI Math Differentiator is running!");
    console.log("Port:", PORT);
});
