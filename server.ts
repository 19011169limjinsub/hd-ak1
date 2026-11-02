import express from 'express';
import { createServer as createViteServer } from 'vite';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
import { getGeminiClient, parseJobPostingText, analyzeJobFit, safeLog } from './api/_lib/gemini';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function startServer() {
  const app = express();
  const PORT = Number(process.env.PORT) || 3000;

  app.use(express.json({ limit: '10mb' }));

  // Health check endpoint
  app.get('/api/health', (req, res) => {
    const { hasApiKey } = getGeminiClient();
    res.json({
      status: 'ok',
      hasApiKey,
      timestamp: new Date().toISOString(),
      platform: 'express-dev',
    });
  });

  // Extract job posting from text or raw content endpoint
  app.post('/api/parse-job', async (req, res) => {
    try {
      const { rawText, companyName, roleTitle } = req.body || {};
      if (!rawText && !roleTitle) {
        return res.status(400).json({ error: '공고 내용 또는 직무명을 입력해주세요.' });
      }

      const result = await parseJobPostingText(rawText, companyName, roleTitle);
      return res.json(result);
    } catch (err: any) {
      safeLog('error', 'Error parsing job posting in server.ts', { error: err.message });
      res.status(500).json({ error: '채용 공고 분석 중 오류가 발생했습니다: ' + err.message });
    }
  });

  // Core Job Fit Analysis Endpoint
  app.post('/api/analyze', async (req, res) => {
    try {
      const { userProfile, jobPosting } = req.body || {};

      if (!userProfile || !jobPosting) {
        return res.status(400).json({ error: '사용자 스펙과 채용 공고 정보가 모두 필요합니다.' });
      }

      const result = await analyzeJobFit(userProfile, jobPosting);
      return res.json(result);
    } catch (err: any) {
      safeLog('error', 'Analysis error in server.ts', { error: err.message });
      res.status(500).json({ error: 'AI 분석 수행 중 오류가 발생했습니다: ' + err.message });
    }
  });

  // Serve static files in production or Vite middleware in development
  if (process.env.NODE_ENV === 'production') {
    app.use(express.static(path.resolve(__dirname, 'dist')));
    app.get('*', (req, res) => {
      res.sendFile(path.resolve(__dirname, 'dist', 'index.html'));
    });
  } else {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`JOB FIT AI server running on port ${PORT}`);
  });
}

startServer();
