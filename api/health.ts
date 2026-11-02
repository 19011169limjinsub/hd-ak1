import { getGeminiClient, safeLog } from './_lib/gemini';

export default async function handler(req: any, res: any) {
  // CORS & headers
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'GET') {
    return res.status(405).json({ error: `Method ${req.method} Not Allowed` });
  }

  try {
    const { hasApiKey } = getGeminiClient();
    safeLog('info', 'Health check requested', { hasApiKey });

    return res.status(200).json({
      status: 'ok',
      hasApiKey,
      timestamp: new Date().toISOString(),
      platform: process.env.VERCEL ? 'vercel' : 'node',
    });
  } catch (err: any) {
    safeLog('error', 'Health check failed', { error: err.message });
    return res.status(500).json({
      error: '서버 상태 확인 중 오류가 발생했습니다.',
      code: 'SERVER_ERROR',
    });
  }
}
