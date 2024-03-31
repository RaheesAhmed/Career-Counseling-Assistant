import express from "express";
import bodyParser from "body-parser";
import cors from "cors";
import runEmbeddings from "./openai_embedings.js";

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
  return `Name: ${userData.question1}\nAge: ${userData.question2}\nGender: ${userData.question3}\nEducational Level: ${userData.question4}\nSubjects: ${userData.question5}\nFinancial Background: ${userData.question6}\nStrengths/Weaknesses: ${userData.question7}\nFuture Goals: ${userData.question8}\nAdditional Information: ${userData.question9}`;
}

// Modify the /career-chat endpoint to use the formatUserData function
app.post("/career-chat", async (req, res) => {
  try {
    const { userData } = req.body;
    console.log("Career Chat User Data:", userData);
    const formattedUserData = formatUserData(userData);
    const response = await runEmbeddings(formattedUserData, "career");
    res.json({ response: response.text });
  } catch (error) {
    console.error(error);
    res.status(500).send("An error occurred");
  }
});
app.post("/open-chat", async (req, res) => {
  try {
    const { userInput } = req.body;
    console.log("Open Chat User Input:", userInput);
    const response = await runEmbeddings(userInput, "open");
    res.json({ response: response.text });
  } catch (error) {
    console.error(error);
    res.status(500).send("An error occurred");
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
