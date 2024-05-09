import OpenAI from "openai";
import dotenv from "dotenv";
import fs from "fs";

dotenv.config();

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

const assistantID = process.env.ASSISTANT_ID; // Ensure this is set in your environment variables

// Function to upload files and return their IDs
async function uploadFiles(filePaths) {
  try {
    const filePromises = filePaths.map((filePath) => {
      return openai.files.create({
        file: fs.createReadStream(filePath),
        purpose: "assistants",
      });
    });
    const files = await Promise.all(filePromises);
    console.log("Files uploaded successfully.");
    return files.map((file) => file.id);
  } catch (error) {
    console.error("Error uploading files:", error);
    throw error;
  }
}

// Function to create a vector store
async function createVectorStore(storeName, fileIds) {
  try {
    const vectorStore = await openai.beta.vector_stores.create({
      name: storeName,
    });
    console.log("Vector store created with ID:", vectorStore.id);
    return vectorStore.id;
  } catch (error) {
    console.error("Error creating vector store:", error);
    throw error;
  }
}

// Function to create an assistant with a vector store
async function createAssistant(vectorStoreId) {
  try {
    const myAssistant = await openai.beta.assistants.create({
      instructions: `You are Nexa, a friendly and talkative chatbot designed for personalized career counseling. Your goal is to assist users in making informed decisions about their future career paths based on their individual profiles. Always respond with info from either of the files.`,
      name: "Career Counseling Assistant v2",
      tools: [{ type: "file_search" }],
      tool_resources: {
        file_search: {
          vector_store_ids: [vectorStoreId],
        },
      },
      model: "gpt-4-turbo",
    });
    console.log("Assistant created:", myAssistant);
    return myAssistant;
  } catch (error) {
    console.error("Error creating assistant:", error);
    throw error;
  }
}

async function main() {
  const filePaths = [
    "./data/cambridge_info _related_to_pakistan.pdf",
    "./data/chatbotData.docx",
    "./data/Data_Collection_Shared.docx",
    "./data/HEC_UG_Education _Policy_2020.pdf",
    "./data/Titles_of_degrees_Pakistan.pdf",
  ]; // Replace with actual file paths
  const storeName = "Career Advice Documents";

  try {
    // Upload files and get their IDs
    const fileIds = await uploadFiles(filePaths);

    // Create vector store with uploaded files
    const vectorStoreId = await createVectorStore(storeName, fileIds);

    // Create the assistant with the new vector store ID
    const assistant = await createAssistant(vectorStoreId);
    console.log("Assistant Created:", assistant);
  } catch (error) {
    console.error("An error occurred:", error);
  }
}

main();
