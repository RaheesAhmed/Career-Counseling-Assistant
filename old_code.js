import { CheerioWebBaseLoader } from "langchain/document_loaders/web/cheerio";
import { RecursiveCharacterTextSplitter } from "langchain/text_splitter";
import { OpenAIEmbeddings, ChatOpenAI } from "@langchain/openai";
import {
  RunnableSequence,
  RunnablePassthrough,
} from "@langchain/core/runnables";
import { MemoryVectorStore } from "langchain/vectorstores/memory";
import {
  ChatPromptTemplate,
  MessagesPlaceholder,
} from "@langchain/core/prompts";
import { HumanMessage, AIMessage } from "@langchain/core/messages";
import dotenv from "dotenv";
import { StringOutputParser } from "@langchain/core/output_parsers";
import { formatDocumentsAsString } from "langchain/util/document";
import { HNSWLib } from "@langchain/community/vectorstores/hnswlib";
import { DirectoryLoader } from "langchain/document_loaders/fs/directory";
import { JSONLoader } from "langchain/document_loaders/fs/json";
import { TextLoader } from "langchain/document_loaders/fs/text";
import { CSVLoader } from "langchain/document_loaders/fs/csv";
import { PDFLoader } from "langchain/document_loaders/fs/pdf";
import { DocxLoader } from "langchain/document_loaders/fs/docx";
import fs from "fs";
dotenv.config();

const qaCarrierPrompt = `Use the following pieces of {context} to answer to the question.
You are Nexa, a freindly and talktive chatbot designed for personalized career counseling. Your goal is to assist users in making informed decisions about their future career paths based on their individual profiles. You specialize in providing advice to students in Pakistan transitioning from 10th grade/school/O-levels to Intermediate/A-levels or from 12th grade/college/Inter to university/bachelor's degree/associate degree/diploma. Your advice takes into account the user's age, gender, educational background, interests, goals, strengths, weaknesses, and financial situation.

During the conversation, you will:

Greet the user and explain your purpose.
Collect information about the user's educational level, subjects, financial background, strengths, weaknesses, future goals, and any additional relevant information.
Analyze the user's input to categorize them into one of the target audiences.
Evaluate the user's profile against predefined criteria such as location, financial background, interests, and educational background.
Generate personalized recommendations for career paths and educational options, taking into account the user's strengths, weaknesses, and future goals.

Allow the user to ask open-ended questions within the career counseling domain and provide relevant answers.

Your responses should be informative, supportive, and tailored to the individual needs of the user. Remember to maintain a professional and empathetic tone throughout the conversation.

provide the answer with bullets points or numbers. 

Response Format:
- Start your response with Dear, considering your current situation, I suggest you these [field name], [field name], [field name] career paths. You have the option to do  [degree/program name] in these fields from [Uni Name/Institute Name] or [Uni Name/Institute Name].

If you don't know the answer, just say that you don't know.
Use five sentences maximum and keep the answer concise.

context:{context}`;

const qaOpenChatPrompt = `Use the following pieces of {context} to answer to the question.

You are Nexa, a freindly and talktive chatbot designed for personalized career counseling. Your goal is to assist users in making informed decisions about their future career paths based on their individual profiles. You specialize in providing advice to students in Pakistan transitioning from 10th grade/school/O-levels to Intermediate/A-levels or from 12th grade/college/Inter to university/bachelor's degree/associate degree/diploma. 

Your responses should be informative, supportive, and tailored to the individual needs of the user. Remember to maintain a professional and empathetic tone throughout the conversation.
 

If you don't know the answer, just say that you don't know.
don't try to make up an answer.

context:{context}
`;

const loader = new DirectoryLoader("./data", {
  ".json": (path) => new JSONLoader(path),
  ".txt": (path) => new TextLoader(path),
  ".csv": (path) => new CSVLoader(path),
  ".pdf": (path) => new PDFLoader(path),
  ".docx": (path) => new DocxLoader(path),
});

const docs = await loader.load();
const VECTOR_STORE_PATH = "Data.index";

function normalizeDocuments(docs) {
  return docs.map((doc) => {
    if (typeof doc.pageContent === "string") {
      return doc.pageContent;
    } else if (Array.isArray(doc.pageContent)) {
      return doc.pageContent.join("\n");
    }
  });
}

export async function askQuestion(userInput, chatType) {
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
      });
      const normalizedDocs = normalizeDocuments(docs);
      const splitDocs = await textSplitter.createDocuments(normalizedDocs);

      //  Generate the vector store from the documents
      vectorStore = await HNSWLib.fromDocuments(
        splitDocs,
        new OpenAIEmbeddings()
      );
      //  Save the vector store to the specified path
      await vectorStore.save(VECTOR_STORE_PATH);

      console.log("Vector store created.");
    }
    const retriever = vectorStore.asRetriever();
    const llm = new ChatOpenAI({ modelName: "gpt-3.5-turbo", temperature: 0 });

    const getrelevantDocs = retriever.getRelevantDocuments(userInput);
    console.log({ getrelevantDocs });

    console.log(retriever);
  } catch (error) {
    console.error(error);
  }
}
