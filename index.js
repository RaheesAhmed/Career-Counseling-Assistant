const express = require("express");
const bodyParser = require("body-parser");
const cors = require("cors");
const multer = require("multer");
const OpenAI = require("openai");
const fsPromises = require("fs").promises;
const fs = require("fs");
require("dotenv").config();
const path = require("path");
const { fileURLToPath } = require("url");
const scrapeGoogleSearchResults = require("./scraper.js");

// Initialize Express app
const app = express();
app.use(cors());
app.use(bodyParser.json());

// Initialize OpenAI
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

// Multer for file upload
const upload = multer({ dest: "uploads/" });
app.use(express.static("public"));
app.use(express.urlencoded({ extended: true }));

app.get("/", (req, res) => {
  res.sendFile(__dirname + "/public/index.html");
});
// Async function to create or get existing assistant
async function getOrCreateAssistant() {
  const assistantFilePath = "./assistant.json";
  let assistantDetails;

  try {
    // Check if the assistant.json file exists
    const assistantData = await fsPromises.readFile(assistantFilePath, "utf8");
    assistantDetails = JSON.parse(assistantData);
  } catch (error) {
    // If file does not exist, create a new assistant

    const file = await openai.files.create({
      file: fs.createReadStream("Chatbot Data.docx"),
      purpose: "assistants",
    });

    const assistantConfig = {
      name: "Helper",
      instructions: `As a Global Career Counseling Assistant, your task is to provide tailored career guidance to students worldwide. When interacting with students, adhere to the following guidelines:

      Understand the Student's Profile: Begin by assessing the student's interests, academic achievements, and current location. Use this information to offer personalized career advice.
            
      Offer Career Path Suggestions: Based on the student's profile, suggest potential career paths. Highlight opportunities that align with both the student's region's employment trends and global career prospects.
            
      Provide Educational Transition Advice: Guide students on necessary educational steps or transitions to pursue their chosen career paths effectively. This may include recommendations on specific courses, degrees, or skill development programs.
            
Format Your Responses: Your advice should be short and to the point, and make it short in two to 5 lines.:  
Concise: Keep your guidance direct and to the point and make it short in two to 3 lines.
Structured: Use bullet points for lists and clear headings for different advice sections.
Stay Within Scope: Focus exclusively on career counseling. If asked about unrelated topics, respond with: Sorry, I am not allowed to perform this action. I can only guide you about global career counseling, educational transitions, and career paths based on your interests, academic achievements, and location.
            
            
Privacy and Ethics: do not respond to any questions other than global career counseling, educational transitions, and career paths based on your interests, academic achievements, and location guidelines. If asked about such topics, respond with: Sorry, I am not allowed to perform this action. I can only guide you about global career counseling, educational transitions, and career paths based on your interests, academic achievements, and location.
            
      Objective: To assist students in navigating their career choices and educational paths with informed, regionally relevant, and globally aware advice, fostering informed decision-making for their future careers.
      For Latest Updated Data you can use the following command: scrapeGoogleSearchResults(userInput).`,
      tools: [{ type: "retrieval" }],
      model: "gpt-3.5-turbo-1106",
      file_ids: [file.id],
    };

    const assistant = await openai.beta.assistants.create(assistantConfig);
    assistantDetails = { assistantId: assistant.id, ...assistantConfig };

    // Save the assistant details to assistant.json
    await fsPromises.writeFile(
      assistantFilePath,
      JSON.stringify(assistantDetails, null, 2)
    );
  }

  return assistantDetails;
}

// POST endpoint to handle chat
app.post("/chat", async (req, res) => {
  try {
    const { userInput } = req.body;
    console.log(userInput);
    //scrapeGoogleSearchResults(userInput);

    const assistantDetails = await getOrCreateAssistant();

    // Create a thread using the assistantId
    const thread = await openai.beta.threads.create();

    // Pass in the user question into the existing thread
    await openai.beta.threads.messages.create(thread.id, {
      role: "user",
      content: userInput,
    });

    // Create a run
    const run = await openai.beta.threads.runs.create(thread.id, {
      assistant_id: assistantDetails.assistantId,
    });

    // Fetch run-status
    let runStatus = await openai.beta.threads.runs.retrieve(thread.id, run.id);

    // Polling mechanism to see if runStatus is completed
    while (runStatus.status !== "completed") {
      await new Promise((resolve) => setTimeout(resolve, 1000));
      runStatus = await openai.beta.threads.runs.retrieve(thread.id, run.id);
    }

    // Get the last assistant message from the messages array
    const messages = await openai.beta.threads.messages.list(thread.id);
    const lastMessageForRun = messages.data
      .filter(
        (message) => message.run_id === run.id && message.role === "assistant"
      )
      .pop();

    if (lastMessageForRun) {
      res.json({ response: lastMessageForRun.content[0].text.value });
      console.log(lastMessageForRun.content[0].text.value);
    } else {
      res.status(500).send("No response received from the assistant.");
    }
  } catch (error) {
    console.error(error);
    res.status(500).send("An error occurred");
  }
});

// Start the server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
