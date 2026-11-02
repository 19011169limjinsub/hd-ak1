/**
 * API Client with robust Content-Type check and sanitized error diagnosis
 */

export interface ApiFetchOptions extends RequestInit {
  timeoutMs?: number;
}

export class ApiError extends Error {
  status: number;
  code: string;
  isHtmlResponse: boolean;

  constructor(message: string, status: number, code: string = 'UNKNOWN_ERROR', isHtmlResponse: boolean = false) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.code = code;
    this.isHtmlResponse = isHtmlResponse;
  }
}

/**
 * Safely logs API request errors without leaking sensitive information
 */
function logSafeApiError(endpoint: string, status: number, reason: string) {
  // Only log endpoint name, HTTP status and diagnostic code
  console.warn(`[JOB FIT API] Error on ${endpoint} | Status: ${status} | Detail: ${reason}`);
}

/**
 * Perform a safe API fetch that:
 * 1. Checks HTTP status code
 * 2. Validates Content-Type header before attempting response.json()
 * 3. Distinguishes 404, 500, 401, 429, etc.
 * 4. Prevents "Unexpected token 'T', The page c... is not valid JSON" errors
 */
export async function safeApiFetch<T = any>(
  endpoint: string,
  options: ApiFetchOptions = {}
): Promise<T> {
  const { timeoutMs = 12000, ...fetchOptions } = options;

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetch(endpoint, {
      ...fetchOptions,
      signal: controller.signal,
      headers: {
        'Accept': 'application/json',
        ...(fetchOptions.headers || {}),
      },
    });

    clearTimeout(timeoutId);

    const status = response.status;
    const contentType = response.headers.get('content-type') || '';
    const isJson = contentType.toLowerCase().includes('application/json');

    // If response is NOT JSON (e.g. Vercel 404/500 HTML error page)
    if (!isJson) {
      const rawText = await response.text();
      const preview = rawText.trim().substring(0, 80).replace(/\s+/g, ' ');
      const isHtml = rawText.trim().startsWith('<') || rawText.trim().startsWith('The page');

      if (status === 404) {
        logSafeApiError(endpoint, 404, 'Endpoint Not Found (HTML/Text returned)');
        throw new ApiError(
          `API 경로(${endpoint})를 찾을 수 없습니다 (404 Not Found).\n` +
          `Vercel Serverless Function(/api 폴더)과 vercel.json이 배포되었는지 확인해주세요.`,
          404,
          'NOT_FOUND_HTML',
          isHtml
        );
      }

      if (status === 401 || status === 403) {
        logSafeApiError(endpoint, status, 'Unauthorized / API Key issue');
        throw new ApiError(
          `Gemini API 인증 오류 (${status}). Vercel 환경 변수 GEMINI_API_KEY를 확인해주세요.`,
          status,
          'AUTH_FAILED',
          isHtml
        );
      }

      if (status === 429) {
        logSafeApiError(endpoint, 429, 'Rate Limit Exceeded');
        throw new ApiError(
          `API 요청 한도를 초과했습니다 (429 Too Many Requests). 잠시 후 다시 시도해주세요.`,
          429,
          'RATE_LIMIT',
          isHtml
        );
      }

      if (status >= 500) {
        logSafeApiError(endpoint, status, `Server Error (${preview})`);
        throw new ApiError(
          `서버 내부 오류가 발생했습니다 (${status} Internal Server Error).\nVercel Functions 배포 로그를 확인해주세요.`,
          status,
          'SERVER_ERROR',
          isHtml
        );
      }

      logSafeApiError(endpoint, status, `Unexpected non-JSON response (${preview})`);
      throw new ApiError(
        `서버에서 JSON 형식이 아닌 응답을 반환했습니다 (${status}): "${preview}..."`,
        status,
        'INVALID_CONTENT_TYPE',
        isHtml
      );
    }

    // Response is JSON
    const data = await response.json();

    if (!response.ok) {
      const errorMsg = data?.error || data?.message || `요청 실패 (${status})`;
      logSafeApiError(endpoint, status, errorMsg);
      throw new ApiError(errorMsg, status, data?.code || 'API_RESPONSE_ERROR');
    }

    return data as T;
  } catch (err: any) {
    clearTimeout(timeoutId);

    if (err.name === 'AbortError') {
      logSafeApiError(endpoint, 408, 'Request Timeout');
      throw new ApiError(
        'AI 분석 요청 시간이 초과되었습니다. 잠시 후 다시 시도해주세요.',
        408,
        'TIMEOUT'
      );
    }

    if (err instanceof ApiError) {
      throw err;
    }

    logSafeApiError(endpoint, 0, err.message || 'Network Failure');
    throw new ApiError(
      `네트워크 연결 오류: ${err.message || '서버와 통신할 수 없습니다.'}`,
      0,
      'NETWORK_ERROR'
    );
  }
}
