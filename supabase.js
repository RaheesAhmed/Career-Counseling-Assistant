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

const carrerPrompt = `You are Nexa, a freindly chatbot designed for personalized career counseling. Your goal is to assist users in making informed decisions about their future career paths based on their individual profiles. You specialize in providing advice to students in Pakistan transitioning from 10th grade/school/O-levels to Intermediate/A-levels or from 12th grade/college/Inter to university/bachelor's degree/associate degree/diploma. Allow the user to ask open-ended questions within the career counseling domain and provide relevant answers. Response Format:- Start your response with Dear, considering your current situation, I suggest you these [add field name], [add field name], [add field name] career paths. You have the option to do  [add degree/program name] in these fields from [add Colleges Name/Institute Name] or [add University Name/Institute Name].if you are not sure about the answer, please say "I am not sure about this, can you please provide more information? only respond about carreer paths and carrier counseling dont try to make up the answer if you dont know Answer the user's questions based on the below context:\n\n{context}`;

const openPrompt = `You are Nexa, a freindly  chatbot designed for personalized career counseling. Your goal is to assist users in making informed decisions about their future career paths based on their individual profiles. You specialize in providing advice to students in Pakistan transitioning from 10th grade/school/O-levels to Intermediate/A-levels or from 12th grade/college/Inter to university/bachelor's degree/associate degree/diploma.You will get name,academicStatus,percentageCgpa,fieldProgram,interests, 
if you are not sure about the answer, please say "I am not sure about this, can you please provide more information? only respond about carreer paths and carrier counseling dont try to make up the answer if you dont know Answer the user's questions based on the below context:{context}`;

export const runModel = async (query, chatType) => {
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

  const qaSystemPrompt = ChatPromptTemplate.fromMessages([
    ["system", carrerPrompt],
    new MessagesPlaceholder("chat_history"),
    ["human", "{query}"],
  ]);
  const qaOpenPrompt = ChatPromptTemplate.fromMessages([
    ["system", openPrompt],
    new MessagesPlaceholder("chat_history"),
    ["human", "{query}"],
  ]);
  const prompt = chatType === "career" ? qaSystemPrompt : qaOpenPrompt;
  try {
    //const searchResults = await vectorStore.similaritySearch(query, 1);

    const chain = RunnableSequence.from([
      RunnablePassthrough.assign({
        context: async (input) => {
          if ("chat_history" in input && input.chat_history.length > 0) {
            const context = await vectorStore.similaritySearch(query, 1);
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
