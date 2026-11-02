import { parseJobPostingText, safeLog } from './_lib/gemini';

export default async function handler(req: any, res: any) {
  // CORS & Content-Type
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({
      error: `지원하지 않는 HTTP 메소드입니다: ${req.method}. POST 요청을 사용해주세요.`,
      code: 'METHOD_NOT_ALLOWED',
    });
  }

  try {
    let body = req.body;
    if (typeof body === 'string') {
      try {
        body = JSON.parse(body);
      } catch {
        return res.status(400).json({
          error: '유효하지 않은 JSON 본문 형식입니다.',
          code: 'INVALID_JSON_BODY',
        });
      }
    }

    const { rawText, companyName, roleTitle } = body || {};

    if (!rawText && !roleTitle) {
      return res.status(400).json({
        error: '공고 원문 내용 또는 직무명을 입력해주세요.',
        code: 'MISSING_INPUT',
      });
    }

    safeLog('info', 'Executing job parsing', { companyName, roleTitle });

    const result = await parseJobPostingText(rawText, companyName, roleTitle);
    return res.status(200).json(result);
  } catch (err: any) {
    safeLog('error', 'Parse-job handler failed', { error: err.message });
    return res.status(500).json({
      error: '채용 공고 분석 및 구조화 중 오류가 발생했습니다: ' + err.message,
      code: 'PARSE_FAILED',
    });
  }
}
