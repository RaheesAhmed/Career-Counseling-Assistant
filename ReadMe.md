# Career Counseling Assistant

A chatbot assistant that provides tailored career guidance to students worldwide, using OpenAI's GPT-3.5-turbo model and a scraping function for up-to-date information.

## Features

- Personalized career advice based on the student's interests, academic achievements, and location.
- Suggestions for potential career paths and educational transitions.
- Integration with a scraping function for the latest data updates.
- User-friendly chat interface.

## Installation

1. Clone the repository:

   ```bash
   git clone https://github.com/RaheesAhmed/Career-Counseling-Assistant.git
   ```

2. Navigate to the project directory:

   ```
   cd Career-Counseling-Assistant
   ```

3. Install the dependencies:

```
cd Career-Counseling-Assistant
```

## Usage

4. Start the server:

```
npm start
```

Open your browser and go to `localhost:3000` to test the chatbot.

## Change the Knowledge Base Docs:

```
const file = await openai.files.create({
      file: fs.createReadStream("Chatbot Data.docx"),
      purpose: "assistants",
    });

```

You can change your documents here `file: fs.createReadStream("Chatbot Data.docx")`,
