import express from 'express';
import { createServer as createViteServer } from 'vite';
import path from 'path';
import sharp from 'sharp';
import { GoogleGenAI, Type } from "@google/genai";
import dotenv from 'dotenv';

dotenv.config();

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY || '' });

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json({ limit: '50mb' }));

  // AI Feedback API (Equivalent to Server Action)
  app.post('/api/ai/analyze-journal', async (req, res) => {
    try {
      const { content, image } = req.body;
      
      let parts: any[] = [{ text: content }];
      if (image) {
        // OCR and Analysis
        parts.push({
          inlineData: {
            data: image.split(',')[1],
            mimeType: 'image/jpeg'
          }
        });
      }

      const response = await ai.models.generateContent({
        model: "gemini-3-flash-preview",
        contents: { parts },
        config: {
          systemInstruction: "당신은 초등학생의 생물 관찰 일지를 분석하는 따뜻하고 격려 넘치는 AI 선생님입니다. 학생의 관찰 내용(텍스트 및 사진 속 손글씨)을 분석하여 구체적인 칭찬과 조언을 제공하세요. 한국어로 답변하세요.",
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              praise: { type: Type.STRING },
              advice: { type: Type.STRING },
              summary: { type: Type.STRING },
              ocrText: { type: Type.STRING, description: "사진 속 손글씨가 있다면 텍스트로 변환한 내용" }
            },
            required: ["praise", "advice", "summary"]
          }
        }
      });
      res.json(JSON.parse(response.text));
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // Biology Identification API
  app.post('/api/ai/identify', async (req, res) => {
    try {
      const { image } = req.body;
      const response = await ai.models.generateContent({
        model: "gemini-3-flash-preview",
        contents: [
          { text: "이 사진 속 생물의 이름과 특징을 초등학생 수준에서 설명해주세요." },
          { inlineData: { data: image.split(',')[1], mimeType: "image/jpeg" } }
        ],
        config: {
          systemInstruction: "생물학 박사로서 사진 속 생물을 식별하고 초등학생이 이해하기 쉽게 설명하세요. 한국어로 답변하세요.",
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              name: { type: Type.STRING },
              description: { type: Type.STRING },
              funFact: { type: Type.STRING }
            },
            required: ["name", "description", "funFact"]
          }
        }
      });
      res.json(JSON.parse(response.text));
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // Chatbot API
  app.post('/api/ai/chat', async (req, res) => {
    try {
      const { message, history } = req.body;
      const response = await ai.models.generateContent({
        model: "gemini-3-flash-preview",
        contents: [...history, { role: "user", parts: [{ text: message }] }],
        config: {
          systemInstruction: "당신은 'AI 생물박사'입니다. 초등학생들의 생물 관련 질문에 친절하고 과학적으로 답변해줍니다. 한국어로 답변하세요."
        }
      });
      res.json({ text: response.text });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // Image Optimization API
  app.post('/api/image/optimize', async (req, res) => {
    try {
      const { image } = req.body; // base64
      const buffer = Buffer.from(image.split(',')[1], 'base64');
      const optimizedBuffer = await sharp(buffer)
        .resize(800, 800, { fit: 'inside' })
        .jpeg({ quality: 80 })
        .toBuffer();
      res.json({ image: `data:image/jpeg;base64,${optimizedBuffer.toString('base64')}` });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
