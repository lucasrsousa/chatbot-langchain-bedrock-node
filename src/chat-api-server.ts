import express from "express";
import bodyParser from "body-parser";
import dotenv from "dotenv";
import { PromptTemplate } from "@langchain/core/prompts";
import { createStuffDocumentsChain } from "langchain/chains/combine_documents";
import { BedrockEmbeddings, ChatBedrockConverse } from "@langchain/aws";
import { CallbackManager } from "@langchain/core/callbacks/manager";
import { FaissStore } from "@langchain/community/vectorstores/faiss";
import { BedrockRuntimeClient } from "@aws-sdk/client-bedrock-runtime";
import { createRetrievalChain } from "langchain/chains/retrieval";

dotenv.config();

const app = express();
const port = 3000;

app.use(bodyParser.json());
app.use(express.static("public"));

(async () => {

  const callbackManager = CallbackManager.fromHandlers({
    handleLLMEnd(output) {
      console.log("Generations:", JSON.stringify(output.generations, null, 2));
      console.log("llmOutput:", output.llmOutput);
    },  
    handleLLMError(error) {
      console.error("Erro no LLM:", error);
    }
  });

  const client = new BedrockRuntimeClient({
    region: "us-east-1",
    credentials: {
      accessKeyId: process.env.ACCESSKEY!,
      secretAccessKey: process.env.SECRETKEY!,
    },
  });

  const embeddings = new BedrockEmbeddings({
    model: "amazon.titan-embed-text-v2:0",
    client: client,
  });

  const vectorstore = await FaissStore.load("./embeddings", embeddings);

  const retriever = vectorstore.asRetriever({ "k": 5, searchType: "similarity" });


  const llm = new ChatBedrockConverse({
    model: "amazon.nova-micro-v1:0",
    region: "us-east-1",
    credentials: {
      accessKeyId: process.env.ACCESSKEY!,
      secretAccessKey: process.env.SECRETKEY!,
    },
    temperature: 0.3,
    maxTokens: 500,
    callbacks: callbackManager
  });

  const prompt = new PromptTemplate({
    inputVariables: ["context", "input"],
    template: `
      Você é um assistente de análise documental. Leia o conteúdo abaixo e responda:

      DOCUMENTO:
      "{context}"

      PERGUNTA:
      {input}
      `,
  });

  const combineDocsChain = await createStuffDocumentsChain({
    llm,
    prompt,
  });

  const retrievalChain = await createRetrievalChain({
    combineDocsChain,
    retriever,
  });

  app.post("/api/chat", async (req, res) => {
    const question = req.body.question;

    try {      
      const response = await retrievalChain.invoke({
        input: question
      });
      
      res.json({ answer: response });
    } catch (error) {
      console.error("Erro ao processar:", error);
      res.status(500).json({ error: "Erro ao gerar resposta." });
    }
  });

  app.listen(port, () => {
    console.log(`Servidor iniciado em http://localhost:${port}`);
  });
})();
