import { analyzeJobFit, safeLog } from './_lib/gemini';

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
    // Body parsing support for Vercel and Node environments
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

    const { userProfile, jobPosting } = body || {};

    if (!userProfile || !jobPosting) {
      safeLog('warn', 'Analyze request missing payload');
      return res.status(400).json({
        error: '사용자 스펙(userProfile)과 채용 공고(jobPosting) 데이터가 모두 필요합니다.',
        code: 'MISSING_REQUIRED_PAYLOAD',
      });
    }

    safeLog('info', 'Executing job fit analysis', {
      company: jobPosting.company,
      role: jobPosting.role,
      skillsCount: userProfile.skills?.length,
    });

    const result = await analyzeJobFit(userProfile, jobPosting);
    return res.status(200).json(result);
  } catch (err: any) {
    const errorMessage = err?.message || '알 수 없는 오류';
    safeLog('error', 'Analysis handler failed', { error: errorMessage });

    // Distinguish common error causes
    let statusCode = 500;
    let errorCode = 'INTERNAL_ERROR';
    let friendlyMessage = 'AI 직무 적합도 분석 중 서버 오류가 발생했습니다.';

    if (errorMessage.includes('401') || errorMessage.includes('API_KEY')) {
      statusCode = 401;
      errorCode = 'API_KEY_INVALID';
      friendlyMessage = 'Gemini API 키 인증에 실패했습니다. Vercel 환경 변수 GEMINI_API_KEY를 확인해주세요.';
    } else if (errorMessage.includes('429') || errorMessage.includes('RESOURCE_EXHAUSTED')) {
      statusCode = 429;
      errorCode = 'RATE_LIMIT_EXCEEDED';
      friendlyMessage = 'Gemini API 요청 한도를 초과했습니다. 잠시 후 다시 시도해주세요.';
    } else if (errorMessage.includes('시간 초과') || errorMessage.includes('timeout')) {
      statusCode = 504;
      errorCode = 'GATEWAY_TIMEOUT';
      friendlyMessage = 'AI 모델 응답 대기 시간이 초과되었습니다. 다시 시도해주세요.';
    }

    return res.status(statusCode).json({
      error: friendlyMessage,
      code: errorCode,
      details: errorMessage,
    });
  }
}
