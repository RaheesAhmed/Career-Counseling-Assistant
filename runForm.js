import dotenv from "dotenv";
import fs from "fs";
import path from "path";
import { createClient } from "@supabase/supabase-js";
import { SupabaseVectorStore } from "@langchain/community/vectorstores/supabase";
import { OpenAIEmbeddings } from "@langchain/openai";
import { DirectoryLoader } from "langchain/document_loaders/fs/directory";
import { JSONLoader } from "langchain/document_loaders/fs/json";
import { TextLoader } from "langchain/document_loaders/fs/text";
import { CSVLoader } from "langchain/document_loaders/fs/csv";
import { PDFLoader } from "langchain/document_loaders/fs/pdf";
import { DocxLoader } from "langchain/document_loaders/fs/docx";
import { OpenAI } from "@langchain/openai";
import { BufferWindowMemory } from "langchain/memory";
import { RetrievalQAChain } from "langchain/chains";
import {
  ChatPromptTemplate,
  MessagesPlaceholder,
} from "@langchain/core/prompts";
import {
  RunnableSequence,
  RunnablePassthrough,
} from "@langchain/core/runnables";
import { StringOutputParser } from "@langchain/core/output_parsers";
import { formatDocumentsAsString } from "langchain/util/document";
import { HumanMessage, AIMessage } from "@langchain/core/messages";
dotenv.config();
const __dirname = path.resolve();
const privateKey = process.env.SUPABASE_PRIVATE_KEY;
const url = process.env.SUPABASE_URL;
const openaiApiKey = process.env.OPENAI_API_KEY;

if (!privateKey || !url || !openaiApiKey) {
  throw new Error("Required environment variables are not set.");
}

const client = createClient(url, privateKey);
const memory = new BufferWindowMemory({
  returnMessages: true,
  memoryKey: "chat_history",
  k: 1,
});

const loadDocuments = async (directoryPath) => {
  console.log("Attempting to load documents from:", directoryPath);
  if (!fs.existsSync(directoryPath)) {
    console.error(`Directory does not exist: ${directoryPath}`);
    return [];
  }

  const loader = new DirectoryLoader(directoryPath, {
    ".json": (path) => new JSONLoader(path),
    ".txt": (path) => new TextLoader(path),
    ".csv": (path) => new CSVLoader(path),
    ".pdf": (path) => new PDFLoader(path),
    ".docx": (path) => new DocxLoader(path),
  });

  try {
    const documents = await loader.load();
    console.log(`Loaded ${documents.length} documents.`);
    return documents;
  } catch (error) {
    console.error("Failed to load documents:", error);
    throw error;
  }
};

const model = new OpenAI({
  modelName: "gpt-3.5-turbo",
  temperature: 1,
  maxTokens: 1000,
});

const systemPrompt = `You are Nexa, a friendly chatbot designed for personalized career counseling. Your goal is to assist users in making informed decisions about their future career paths based on their individual profiles. You specialize in providing advice to students in Pakistan transitioning from 10th grade/school/O-levels to Intermediate/A-levels or from 12th grade/college/Inter to university/bachelor's degree/associate degree/diploma.

You will get name, academicStatus, percentageCgpa, fieldProgram, and interests based on user data. Suggest the best colleges or universities to the user and give the response in the form of a report like JSON object. Always provide the response in the following JSON format:

{{
  "Name": "user name",
  "Academic Status": "Academic Status",
  "Percentage/CGPA": "Percentage/CGPA",
  "Field/Program of Interest": "Field/Program of Interest",
  "Interests": "Interests",
  "Recommended Colleges or Universities": {{
    "1.": "College/University 1",
    "2.": "College/University 2",
    "3.": "College/University 3",
    "4.": "College/University 4"
  }}
}}

Always answer the user's questions based on the below context:
{context}`;

export const runform = async (query, chatType) => {
  const dataPath = path.resolve(__dirname, "./data");
  const docs = await loadDocuments(dataPath);

  if (!docs.length) {
    console.log("No documents to process.");
    return;
  }

  const vectorStore = new SupabaseVectorStore(new OpenAIEmbeddings(), {
    client,
    tableName: "documents",
    queryName: "match_documents",
  });

  console.log("Searching for similar documents...");

  const prompt = ChatPromptTemplate.fromMessages([
    ["system", systemPrompt],
    new MessagesPlaceholder("chat_history"),
    ["human", "{query}"],
  ]);
  var context;
  try {
    //const searchResults = await vectorStore.similaritySearch(query, 1);

    const chain = RunnableSequence.from([
      RunnablePassthrough.assign({
        context: async (input) => {
          if ("chat_history" in input && input.chat_history.length > 0) {
            context = await vectorStore.similaritySearch(query, 1);
            return formatDocumentsAsString(context);
          }
          return "";
        },
      }),
      prompt,
      model,
      new StringOutputParser(),
    ]);
    let chat_history = [];

    console.log("Querying chain...");
    const res = await chain.invoke({
      query: query,
      chat_history,
      context,
    });
    chat_history.push(new HumanMessage(query));
    chat_history.push(new AIMessage(res));
    console.log("Querying chain Finished...");

    console.log({ res });

    return res;
  } catch (error) {
    console.error("Search failed:", error);
  }
};
