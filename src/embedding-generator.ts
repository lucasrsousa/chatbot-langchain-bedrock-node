import { BedrockEmbeddings } from "@langchain/aws";
import { PDFLoader } from "@langchain/community/document_loaders/fs/pdf";
import { DocxLoader } from "@langchain/community/document_loaders/fs/docx"; 
import { TextLoader } from "langchain/document_loaders/fs/text"; 
import { FaissStore } from "@langchain/community/vectorstores/faiss";
import { BedrockRuntimeClient } from "@aws-sdk/client-bedrock-runtime";
import { RecursiveCharacterTextSplitter } from "@langchain/textsplitters";
import fs from 'fs';
import path from 'path';
import dotenv from 'dotenv';

dotenv.config({ path: './.env' });
export const accessKey: any = process.env.ACCESSKEY;
export const secretKey: any = process.env.SECRETKEY;

async function split_text(pages: any, chunk_size: number, chunk_overlap: number) {
  const textSplitter = new RecursiveCharacterTextSplitter({ chunkSize: chunk_size, chunkOverlap: chunk_overlap });
  const docs = await textSplitter.splitDocuments(pages);
  return docs;
}

async function createFaissIndex() {
  let documents: any[] = [];
  
  const files = fs.readdirSync("./assets");

  for (const file of files) {
    const filePath = path.join("./assets", file);

    if (file.endsWith(".pdf")) {
      const loader = new PDFLoader(filePath);
      const pdfDocs = await loader.load();
      documents.push(...pdfDocs);
    } else if (file.endsWith(".docx") || file.endsWith(".doc")) {
      const loader = new DocxLoader(filePath);
      const docxDocs = await loader.load();
      documents.push(...docxDocs);
    } else if (file.endsWith(".txt")) {
      const loader = new TextLoader(filePath);
      const textDocs = await loader.load();
      documents.push(...textDocs);
    }
  }

  const pages = await split_text(documents, 1000, 200);

  const client = new BedrockRuntimeClient({
    region: "us-east-1",
    credentials: {
      accessKeyId: accessKey,
      secretAccessKey: secretKey
    },
  });
  
  const embeddings = new BedrockEmbeddings({
    model: "amazon.titan-embed-text-v2:0",
    client: client,
  });
  
  const vectorstore = await FaissStore.fromDocuments(pages, embeddings);
  await vectorstore.save("./embeddings");
}

createFaissIndex()
  .then(() => {
    console.log("Índice FAISS criado com sucesso!");
  })
  .catch((error) => {
    console.error("Erro ao criar o índice:", error);
  });