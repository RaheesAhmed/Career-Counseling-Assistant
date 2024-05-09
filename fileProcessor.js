import { PDFLoader } from "langchain/document_loaders/fs/pdf";
import { CSVLoader } from "langchain/document_loaders/fs/csv";
import { TextLoader } from "langchain/document_loaders/fs/text";
import { JSONLoader } from "langchain/document_loaders/fs/json";
import { DocxLoader } from "langchain/document_loaders/fs/docx";
import { EPubLoader } from "langchain/document_loaders/fs/epub";
import { RecursiveCharacterTextSplitter } from "langchain/text_splitter";
import { OpenAIEmbeddings } from "@langchain/openai";
import { SupabaseVectorStore } from "@langchain/community/vectorstores/supabase";
import fs from "fs";
import path from "path";
import { createClient } from "@supabase/supabase-js";
import dotenv from "dotenv";

dotenv.config();

const dataFolderPath = "./data";
const privateKey = process.env.SUPABASE_PRIVATE_KEY;
if (!privateKey) throw new Error(`Expected env var SUPABASE_PRIVATE_KEY`);

const url = process.env.SUPABASE_URL;
if (!url) throw new Error(`Expected env var SUPABASE_URL`);

const client = createClient(url, privateKey);

const loaders = {
  pdf: PDFLoader,
  csv: CSVLoader,
  txt: TextLoader,
  json: JSONLoader,
  docx: DocxLoader,
  epub: EPubLoader,
};

const processFile = async (filePath) => {
  const fileExtension = path.extname(filePath).substring(1).toLowerCase();
  const loaderClass = loaders[fileExtension];
  if (!loaderClass) {
    console.error(`No loader found for file extension: ${fileExtension}`);
    return;
  }

  try {
    const loader = new loaderClass(filePath);
    const docs = await loader.load();
    const splitter = new RecursiveCharacterTextSplitter({
      chunkSize: 1500,
      chunkOverlap: 200,
    });
    const docOutput = await splitter.splitDocuments(docs);
    const vectorStore = await SupabaseVectorStore.fromDocuments(
      docOutput,
      new OpenAIEmbeddings(),
      {
        client,
        tableName: "documents",
        queryName: "match_documents",
      }
    );
    console.log(`Processed file: ${filePath}`);
  } catch (err) {
    console.error(`Error processing file: ${filePath}`, err);
  }
};

const readAllFiles = async (folderPath) => {
  const files = fs.readdirSync(folderPath);
  for (const file of files) {
    const filePath = path.join(folderPath, file);
    const stat = fs.statSync(filePath);
    if (stat.isFile()) {
      await processFile(filePath);
    } else if (stat.isDirectory()) {
      await readAllFiles(filePath); // Recursive call for subdirectories
    }
  }
};

readAllFiles(dataFolderPath).then(() => {
  console.log("Finished processing all files");
});
