// Import document loaders for different file formats
import { DirectoryLoader } from "langchain/document_loaders/fs/directory";
import { JSONLoader } from "langchain/document_loaders/fs/json";
import { TextLoader } from "langchain/document_loaders/fs/text";
import { CSVLoader } from "langchain/document_loaders/fs/csv";
import { PDFLoader } from "langchain/document_loaders/fs/pdf";
import { DocxLoader } from "langchain/document_loaders/fs/docx";
import { ConversationalRetrievalQAChain } from "langchain/chains";

import { HNSWLib } from "@langchain/community/vectorstores/hnswlib";
import { OpenAIEmbeddings, ChatOpenAI } from "@langchain/openai";
import { RecursiveCharacterTextSplitter } from "langchain/text_splitter";
import { BufferMemory } from "langchain/memory";

import dotenv from "dotenv";
import fs from "fs";

dotenv.config();

// Initialize the document loader with supported file formats
const loader = new DirectoryLoader("./data", {
  ".json": (path) => new JSONLoader(path),
  ".txt": (path) => new TextLoader(path),
  ".csv": (path) => new CSVLoader(path),
  ".pdf": (path) => new PDFLoader(path),
  ".docx": (path) => new DocxLoader(path),
});

//  Load documents from the specified directory
console.log("Loading docs...");
const docs = await loader.load();
console.log("Docs loaded.");

const VECTOR_STORE_PATH = "Data.index";

// Define a function to normalize the content of the documents
function normalizeDocuments(docs) {
  return docs.map((doc) => {
    if (typeof doc.pageContent === "string") {
      return doc.pageContent;
    } else if (Array.isArray(doc.pageContent)) {
      return doc.pageContent.join("\n");
    }
  });
}

const OPEN_CHAT_PROMPT = `
Given the following conversation and a follow up question, return the conversation history excerpt that includes any relevant context to the question if it exists and rephrase the follow up question to be a standalone question.
Chat History:
{chat_history}
Follow Up Input: {question}
Your answer should follow the following format:
\`\`\`
Use the following pieces of context to answer the users question.

your name is Nexa, and you are a friendly career counseling chatbot. you will have a conversation with a human. You specialize in personalized advice for students in Pakistan. Your goal is to help users make informed decisions about their future career paths based on their age,

If you don't know the answer, just say that you don't know, don't try to make up an answer.
----------------
<Relevant chat history excerpt as context here>
Standalone question: <Rephrased question here>
\`\`\`
Your answer:

`;

const CAREER_CHAT_PROMPT = `
You are a friendly career counseling chatbot your name is Nexa,,you will have a conversation with a human.You 
are a , specializing in personalized advice for students 
in Pakistan. Your goal is to help users make informed 
decisions about their future career paths based on their 
age, gender, educational background, interests, goals, 
strengths, weaknesses, and financial situation. Use 
the information provided by the user and the context 
to categorize them into one of the target audiences 
and provide tailored advice.When you recieved the user Data Greet him/her and ask for the question.

Given the following conversation and a follow up question, return the conversation history excerpt that includes any relevant context to the question if it exists and rephrase the follow up question to be a standalone question.
Chat History:
{chat_history}
Follow Up Input: {question}
Your answer should follow the following format:
\`\`\`

Use the following pieces of context to answer the users question.
If you don't know the answer, just say that you don't know, don't try to make up an answer.

Dear [add user name], considering your current situation, I suggest you these [add field name], [add field name], [add field name] career paths. You have the option to do [add degree/program name] or [ad degree/program name] in these fields from [add Uni Name/Institute Name] or [Uni add Name/Institute Name]
----------------
<Relevant chat history excerpt as context here>
Standalone question: <Rephrased question here>
\`\`\`
Your answer:`;

// Define the main function to run the entire process
const runEmbeddings = async (userInput, chatType) => {
  try {
    let vectorStore;

    // Check if an existing vector store is available
    console.log("Checking for existing vector store...");
    if (fs.existsSync(VECTOR_STORE_PATH)) {
      //  Load the existing vector store
      console.log("Loading existing vector store...");
      vectorStore = await HNSWLib.load(
        VECTOR_STORE_PATH,
        new OpenAIEmbeddings()
      );
      console.log("Vector store loaded.");
    } else {
      //  Create a new vector store if one does not exist
      console.log("Creating new vector store...");
      const textSplitter = new RecursiveCharacterTextSplitter({
        chunkSize: 1500,
        chunkOverlap: 250,
      });
      const normalizedDocs = normalizeDocuments(docs);
      const splitDocs = await textSplitter.createDocuments(normalizedDocs);

      //  Generate the vector store from the documents
      vectorStore = await HNSWLib.fromDocuments(
        splitDocs,
        new OpenAIEmbeddings({ model: "text-embedding-3-small" })
      );
      //  Save the vector store to the specified path
      await vectorStore.save(VECTOR_STORE_PATH);

      console.log("Vector store created.");
    }

    const fasterModel = new ChatOpenAI({
      modelName: "gpt-3.5-turbo-16k",
      temperature: 1,
    });
    const slowerModel = new ChatOpenAI({
      modelName: "gpt-3.5-turbo",
      temperature: 1,
    });

    let prompt = chatType === "career" ? CAREER_CHAT_PROMPT : OPEN_CHAT_PROMPT;

    const chain = ConversationalRetrievalQAChain.fromLLM(
      slowerModel,
      vectorStore.asRetriever({ k: 3, searchType: "similarity" }),
      {
        returnSourceDocuments: false,
        memory: new BufferMemory({
          memoryKey: "chat_history",
          inputKey: "question",
          outputKey: "text",
          returnMessages: true,
        }),
        questionGeneratorChainOptions: {
          llm: fasterModel,
          template: prompt,
        },
      }
    );

    //console.log("Running Chains...", chain);
    const res = await chain.invoke({ question: userInput });
    console.log(res);

    return res;
  } catch (error) {
    console.error(error);
  }
};

export default runEmbeddings;
