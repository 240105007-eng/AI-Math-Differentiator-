# AI Math Differentiator

## Project Overview

AI Math Differentiator is an interactive web application designed to help students learn quadratic equations at different difficulty levels.

The application uses Groq AI to generate mathematical questions and provide explanations based on the student's selected level.

## Features

- Three difficulty levels: Foundation, Standard, and Advanced
- AI-generated quadratic equations
- Step-by-step explanations
- Hints and solutions
- Answer checking and feedback
- Interactive web interface

## Technologies Used

- HTML, CSS, JavaScript
- Node.js and Express
- Groq API

## How to Run Locally

1. Install Node.js.
2. Clone or download this repository.
3. Run `npm install`.
4. Create a `.env` file containing `GROQ_API_KEY=your_api_key`.
5. Run `node server.js`.
6. Open `http://localhost:3000`.

## Differentiated Learning

**Foundation:** Simple quadratic equations with guided explanations.

**Standard:** Quadratic equations with coefficients and standard problem-solving methods.

**Advanced:** More challenging quadratic equations requiring additional reasoning.

## Security

The Groq API key is stored in a local `.env` file and is not included in this repository.
