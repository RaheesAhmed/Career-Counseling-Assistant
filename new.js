// 1. Import document loaders for different file formats
import { DirectoryLoader } from "langchain/document_loaders/fs/directory";
// import { JSONLoader } from "langchain/document_loaders/fs/json";
import { TextLoader } from "langchain/document_loaders/fs/text";
import { CSVLoader } from "langchain/document_loaders/fs/csv";
import { PDFLoader } from "langchain/document_loaders/fs/pdf";
import { DocxLoader } from "langchain/document_loaders/fs/docx";
import { ChatPromptTemplate } from "@langchain/core/prompts";
// 2. Import OpenAI language model and other related modules
import { OpenAI } from "@langchain/openai";
import { RetrievalQAChain } from "langchain/chains";
import { HNSWLib } from "@langchain/community/vectorstores/hnswlib";
import { OpenAIEmbeddings } from "@langchain/openai";
import { RecursiveCharacterTextSplitter } from "langchain/text_splitter";
import { ChatMessageHistory } from "langchain/stores/message/in_memory";
// 3. Import Tiktoken for token counting
import { Tiktoken } from "@dqbd/tiktoken/lite";
import { load } from "@dqbd/tiktoken/load";
import registry from "@dqbd/tiktoken/registry.json" assert { type: "json" };
import models from "@dqbd/tiktoken/model_to_encoding.json" assert { type: "json" };
import { MemoryVectorStore } from "langchain/vectorstores/memory";

// 4. Import dotenv for loading environment variables and fs for file system operations
import dotenv from "dotenv";
import fs from "fs";
dotenv.config();

// 5. Initialize the document loader with supported file formats
const loader = new DirectoryLoader("./data", {
  ".json": (path) => new JSONLoader(path),
  ".txt": (path) => new TextLoader(path),
  ".csv": (path) => new CSVLoader(path),
  ".pdf": (path) => new PDFLoader(path),
  ".docx": (path) => new DocxLoader(path),
});

// 6. Load documents from the specified directory
console.log("Loading docs...");
const docs = await loader.load();
console.log("Docs loaded.");

// 7. Define a function to calculate the cost of tokenizing the documents
async function calculateCost() {
  const modelName = "text-embedding-ada-002";
  const modelKey = models[modelName];
  const model = await load(registry[modelKey]);
  const encoder = new Tiktoken(
    model.bpe_ranks,
    model.special_tokens,
    model.pat_str
  );
  const tokens = encoder.encode(JSON.stringify(docs));
  const tokenCount = tokens.length;
  const ratePerThousandTokens = 0.0004;
  const cost = (tokenCount / 1000) * ratePerThousandTokens;
  encoder.free();
  return cost;
}

const VECTOR_STORE_PATH = "Data.index";

// 8. Define a function to normalize the content of the documents
function normalizeDocuments(docs) {
  return docs.map((doc) => {
    if (typeof doc.pageContent === "string") {
      return doc.pageContent;
    } else if (Array.isArray(doc.pageContent)) {
      return doc.pageContent.join("\n");
    }
  });
}

const formPrompt = ChatPromptTemplate.fromMessages([
  [
    "system",
    `You are Nexa, a friendly chatbot designed for personalized career counseling. Your goal is to assist users in making informed decisions about their future career paths based on their individual profiles. You specialize in providing advice to students in Pakistan transitioning from 10th grade/school/O-levels to Intermediate/A-levels or from 12th grade/college/Inter to university/bachelor's degree/associate degree/diploma.

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
    {context}`,
  ],
  ["human", "{question}"],
]);

const messageHistory = new ChatMessageHistory();
// 9. Define the main function to run the entire process
export const ask = async (question, chatType) => {
  // 10. Calculate the cost of tokenizing the documents
  console.log("Calculating cost...");
  const cost = await calculateCost();
  console.log("Cost calculated:", cost);

  // 11. Check if the cost is within the acceptable limit
  if (cost <= 1) {
    // 12. Initialize the OpenAI language model
    const model = new OpenAI({
      temperature: 1,
      maxTokens: 300,
      modelName: "gpt-3.5-turbo-1106",
    });

    let vectorStore;

    // 13. Check if an existing vector store is available
    console.log("Checking for existing vector store...");
    if (fs.existsSync(VECTOR_STORE_PATH)) {
      // 14. Load the existing vector store
      console.log("Loading existing vector store...");
      vectorStore = await HNSWLib.load(
        VECTOR_STORE_PATH,
        new OpenAIEmbeddings()
      );
      console.log("Vector store loaded.");
    } else {
      // 15. Create a new vector store if one does not exist
      console.log("Creating new vector store...");
      const textSplitter = new RecursiveCharacterTextSplitter({
        chunkSize: 1000,
      });
      const normalizedDocs = normalizeDocuments(docs);
      const splitDocs = await textSplitter.createDocuments(normalizedDocs);

      // 16. Generate the vector store from the documents
      vectorStore = await HNSWLib.fromDocuments(
        splitDocs,
        new OpenAIEmbeddings()
      );
      // 17. Save the vector store to the specified path
      await vectorStore.save(VECTOR_STORE_PATH);

      console.log("Vector store created.");
    }
    await messageHistory.addMessage({
      content: question,
      additional_kwargs: {},
    });

    // 18. Create a retrieval chain using the language model and vector store
    console.log("Creating retrieval chain...");
    const chain = RetrievalQAChain.fromLLM(model, vectorStore.asRetriever(), {
      prompt: formPrompt,
      messageHistory: messageHistory,
    });

    // 19. Query the retrieval chain with the specified question
    console.log("Querying chain...");
    const res = await chain.invoke({ query: question });
    console.log({ res });
    return res;
  } else {
    // 20. If the cost exceeds the limit, skip the embedding process
    console.log("The cost of embedding exceeds $1. Skipping embeddings.");
  }
};
