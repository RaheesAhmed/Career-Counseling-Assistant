import express from "express";
import bodyParser from "body-parser";
import cors from "cors";
import { askQuestion } from "./openai_embedings.js";

const app = express();
app.use(cors());
app.use(bodyParser.json());
app.use(express.static("public"));
app.use(express.urlencoded({ extended: true }));

app.get("/", (req, res) => {
  res.sendFile(__dirname + "/public/index.html");
});

// Helper function to format userData into a string
function formatUserData(userData) {
  return (
    `Name: ${userData.question1}\n` +
    `Age: ${userData.question2}\n` +
    `Gender: ${userData.question3}\n` +
    `Educational Level: ${userData.question4}\n` +
    `Subjects: ${userData.question5}\n` +
    `Financial Background: ${userData.question6}\n` +
    `Strengths/Weaknesses: ${userData.question7}\n` +
    `Future Goals: ${userData.question8}\n` +
    `Additional Information: ${userData.question9}`
  );
}

// Modify the /career-chat endpoint to use the formatUserData function
app.post("/career-chat", async (req, res) => {
  try {
    let chatType = "career";
    const { userData } = req.body;
    console.log("Career Chat User Data:", userData);
    const formattedUserData = formatUserData(userData);
    const response = await askQuestion(formattedUserData, chatType);
    res.json({ response: response });
  } catch (error) {
    console.error(error);
    res.status(500).send("An error occurred");
  }
});
app.post("/open-chat", async (req, res) => {
  try {
    const { userInput } = req.body;

    let chatType = "open";
    askQuestion(userInput, chatType);
    console.log("Open Chat User Input:", userInput);
    const response = await askQuestion(userInput, chatType);
    console.log("Open Chat Response:", response);
    res.json({ response: response });
  } catch (error) {
    console.error(error);
    res.status(500).send("An error occurred");
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
