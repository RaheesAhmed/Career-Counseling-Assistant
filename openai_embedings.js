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

const qaCarrierPrompt = `Use the following pieces of {context} to answer the question.
You are Nexa, a freindly and talktive chatbot designed for personalized career counseling. Your goal is to assist users in making informed decisions about their future career paths based on their individual profiles. You specialize in providing advice to students in Pakistan transitioning from 10th grade/school/O-levels to Intermediate/A-levels or from 12th grade/college/Inter to university/bachelor's degree/associate degree/diploma. Your advice takes into account the user's age, gender, educational background, interests, goals, strengths, weaknesses, and financial situation.

Allow the user to ask open-ended questions within the career counseling domain and provide relevant answers.
Your responses should be informative, supportive, and tailored to the individual needs of the user. Remember to maintain a professional and empathetic tone throughout the conversation.

Response Format:
- Start your response with Dear, considering your current situation, I suggest you these [field name], [field name], [field name] career paths. You have the option to do  [degree/program name] in these fields from [Uni Name/Institute Name] or [Uni Name/Institute Name].

If you don't know the answer, just say that you don't know.
Use five sentences maximum and keep the answer concise.

context:{context}`;

const qaOpenChatPrompt = `Use the following pieces of {context} to answer the question.

You are Nexa, a freindly and talktive chatbot designed for personalized career counseling. Your goal is to assist users in making informed decisions about their future career paths based on their individual profiles. You specialize in providing advice to students in Pakistan transitioning from 10th grade/school/O-levels to Intermediate/A-levels or from 12th grade/college/Inter to university/bachelor's degree/associate degree/diploma. 

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

export async function askQuestion(userInput, chatType) {
  console.log("User Input:", userInput);
  console.log("Chat Type:", chatType);
  try {
    const textSplitter = new RecursiveCharacterTextSplitter({
      chunkSize: 1500,
      chunkOverlap: 250,
    });
    const splits = await textSplitter.splitDocuments(docs);

    //  Generate the vector store from the documents
    const vectorStore = await MemoryVectorStore.fromDocuments(
      splits,
      new OpenAIEmbeddings()
    );

    const retriever = await vectorStore.asRetriever({
      k: 3,
      searchType: "hnswlib",
      indexPath: "Data.index",
    });
    const llm = new ChatOpenAI({
      modelName: "gpt-3.5-turbo",
      temperature: 1,
      maxTokens: 1000,
    });

    const qaSystemPrompt = ChatPromptTemplate.fromMessages([
      ["system", qaCarrierPrompt],
      new MessagesPlaceholder("chat_history"),
      ["human", "{question}"],
    ]);
    const qaOpenPrompt = ChatPromptTemplate.fromMessages([
      ["system", qaOpenChatPrompt],
      new MessagesPlaceholder("chat_history"),
      ["human", "{question}"],
    ]);

    const prompt = chatType === "career" ? qaSystemPrompt : qaOpenPrompt;
    const ragChain = RunnableSequence.from([
      RunnablePassthrough.assign({
        context: async (input) => {
          if ("chat_history" in input && input.chat_history.length > 0) {
            const context = await retriever.invoke(input.question);
            return formatDocumentsAsString(context);
          }
          return "";
        },
      }),
      prompt,
      llm,
      new StringOutputParser(),
    ]);

    let chat_history = [];

    const response = await ragChain.invoke({
      question: userInput,
      chat_history,
    });
    chat_history.push(new HumanMessage(userInput));
    chat_history.push(new AIMessage(response));
    console.log({ response });
    return response;
  } catch (error) {
    console.error(error);
  }
}
