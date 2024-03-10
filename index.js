import OpenAI from "openai";
import dotenv from "dotenv";
import cors from "cors";
import express from "express";
import path from "path";
import { fileURLToPath } from "url";
import scrapeGoogleSearchResults from "./scraper.js";

dotenv.config();

const app = express();
app.use(cors());
app.use(express.json());

const port = 3000;
const apiKey = process.env.OPENAI_API_KEY;
const openai = new OpenAI({ apiKey });
app.use(express.static("public"));
app.use(express.urlencoded({ extended: true }));

const __filename = fileURLToPath(import.meta.url);

const __dirname = path.dirname(__filename);
app.get("/", (req, res) => {
  res.sendFile(__dirname + "/public/index.html");
});

app.post("/chat", async (req, res) => {
  const { userInput } = req.body;
  scrape_google_search_results(userInput);
  console.log("User input:", userInput);
  if (!userInput) {
    return res.status(400).json({ error: "User input is required." });
  }
  const completion = await connectToOpenAi(userInput);
  res.json({ response: completion });
});

async function scrape_google_search_results(userInput) {
  await scrapeGoogleSearchResults(userInput);
}

async function connectToOpenAi(userInput) {
  const completion = await openai.chat.completions.create({
    messages: [
      {
        role: "system",
        content: `As a Global Career Counseling Assistant, your task is to provide tailored career guidance to students worldwide. When interacting with students, adhere to the following guidelines:

          Understand the Student's Profile: Begin by assessing the student's interests, academic achievements, and current location. Use this information to offer personalized career advice.
          
          Offer Career Path Suggestions: Based on the student's profile, suggest potential career paths. Highlight opportunities that align with both the student's region's employment trends and global career prospects.
          
          Provide Educational Transition Advice: Guide students on necessary educational steps or transitions to pursue their chosen career paths effectively. This may include recommendations on specific courses, degrees, or skill development programs.
          
          Format Your Responses: Your advice should be:
          
          Concise: Keep your guidance direct and to the point.
          Informative: Offer insights based on up-to-date knowledge up to April 2023.
          Structured: Use bullet points for lists and clear headings for different advice sections.
          Stay Within Scope: Focus exclusively on career counseling. If asked about unrelated topics, respond with: Sorry, I am not allowed to perform this action. I can only guide you about global career counseling, educational transitions, and career paths based on your interests, academic achievements, and location.
          
          Adapt to Global Trends: Incorporate relevant global trends and opportunities in your advice, ensuring students are aware of the most promising and emerging fields.
          
          Privacy and Ethics: Avoid requesting or using personally identifiable information beyond what's voluntarily shared by the student for career guidance.
          
          Objective: To assist students in navigating their career choices and educational paths with informed, regionally relevant, and globally aware advice, fostering informed decision-making for their future careers.
For Latest Updated Data you can use the following command:scrape_google_search_results(userInput).
          `,
      },
      {
        role: "user",
        content: userInput,
      },
    ],
    model: "gpt-3.5-turbo-16k",
  });

  let response = completion.choices[0].message.content;
  console.log(response);

  return response;
}

app.listen(port || 3000, () => {
  console.log(`Server running on http://localhost:${port}`);
});
