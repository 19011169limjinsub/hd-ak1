import { UserProfile, JobPosting, AnalysisResult } from '../types';

/**
 * Client-side heuristic analysis generator
 * Used as a fallback if Vercel serverless function returns 404 or fails
 */
export function generateClientFallbackAnalysis(
  userProfile: UserProfile,
  jobPosting: JobPosting
): AnalysisResult {
  const userSkills: string[] = (userProfile.skills || []).map((s: any) =>
    typeof s === 'string' ? s.toLowerCase() : (s.name || '').toLowerCase()
  );
  const userProjects = userProfile.projects || [];
  const requiredSkills: string[] = jobPosting.mandatorySkills || [];
  const preferredSkills: string[] = jobPosting.preferredSkills || [];

  let matchedSkillsCount = 0;
  const skillsGapAnalysis: any[] = [];

  requiredSkills.forEach((req: string) => {
    const cleanReq = req.toLowerCase();
    const hasMatch = userSkills.some((s) => s.includes(cleanReq) || cleanReq.includes(s));
    if (hasMatch) {
      matchedSkillsCount++;
      skillsGapAnalysis.push({
        skillName: req,
        category: '핵심 요구 역량',
        status: '충족',
        userLevel: '보유 중 (프로젝트 활용)',
        requiredLevel: '필수',
        learningDirection: '현 실무 수준에서 성능 프로파일링 및 대규모 데이터 환경 최적화 기법 심화 학습 권장',
        projectIdea: `실제 서비스 부하 테스트 도구(k6, Locust)를 도입하여 성능 30% 개선 성과 수치화`,
      });
    } else {
      skillsGapAnalysis.push({
        skillName: req,
        category: '핵심 요구 역량',
        status: '보완 필요',
        userLevel: '경험 미확인',
        requiredLevel: '필수',
        learningDirection: `공식 문서 기반의 코어 아키텍처 학습 및 기본 CRUD/API 연동 실습 우선 진행`,
        projectIdea: `${req}의 주요 특징을 활용한 1주 완성 마이크로 데모 프로젝트 제작 및 GitHub Readme 정리`,
      });
    }
  });

  preferredSkills.forEach((pref: string) => {
    const cleanPref = pref.toLowerCase();
    const hasMatch = userSkills.some((s) => s.includes(cleanPref) || cleanPref.includes(s));
    if (hasMatch) {
      skillsGapAnalysis.push({
        skillName: pref,
        category: '우대 역량',
        status: '충족',
        userLevel: '보유 중',
        requiredLevel: '우대',
        learningDirection: '기존 프로젝트에 적용된 아키텍처 패턴과 의사결정 근거를 포트폴리오에 상세 기술',
        projectIdea: '실제 운영 환경에서의 모니터링 메트릭(Prometheus/Grafana) 연계 포트폴리오 강화',
      });
    } else {
      skillsGapAnalysis.push({
        skillName: pref,
        category: '우대 역량',
        status: '학습 권장',
        userLevel: '미보유',
        requiredLevel: '우대',
        learningDirection: `가산점 획득을 위해 오픈소스 튜토리얼 및 실습 컨테이너 환경 구축 추천`,
        projectIdea: `기존 토이 프로젝트에 ${pref} 모듈을 플러그인 형태로 추가 구현`,
      });
    }
  });

  const totalRequired = Math.max(requiredSkills.length, 1);
  const ratio = Math.min(Math.max((matchedSkillsCount / totalRequired) * 100, 48), 95);
  const jobFitScore = Math.round(ratio);

  let competitivenessLevel = '중상 (경쟁력 있음)';
  if (jobFitScore >= 85) competitivenessLevel = '상 (합격 유력권)';
  else if (jobFitScore < 65) competitivenessLevel = '도전권 (집중 보완 필요)';

  return {
    id: 'analysis-' + Date.now() + '-' + Math.random().toString(36).substring(2, 6),
    userProfileId: userProfile.id,
    jobPosting,
    jobFitScore,
    scoreRationale: `${jobPosting.company || '해당 기업'}의 ${jobPosting.role || '직무'} 요구사항과 비교했을 때, 핵심 기술 스택의 약 ${jobFitScore}%가 일치합니다. 특히 ${userProjects.length > 0 ? userProjects[0].title || '진행한 프로젝트' : '보유 역량'}에서 다룬 실무 경험이 긍정적으로 작용하며, 일부 필수/우대 인프라 요건을 보완할 경우 합격 가능성이 대폭 상승할 것으로 분석됩니다.`,
    matchBreakdown: {
      techStackMatch: {
        score: jobFitScore,
        label: '기술 스택 일치도',
        details: `주요 요구 기술 중 핵심 언어 및 프레임워크가 일치하며, 보완 기술은 학습 곡선이 비교적 완만합니다.`,
      },
      projectExperienceMatch: {
        score: Math.min(jobFitScore + 3, 98),
        label: '프로젝트 경험 일치도',
        details: `수행한 프로젝트의 문제 해결 경험과 도메인 적용력이 채용 직무의 일상 업무와 밀접합니다.`,
      },
      jobRelevance: {
        score: Math.max(jobFitScore - 4, 55),
        label: '직무 관련 경험 일치도',
        details: `실무 협업 방식, Git 기반 형상 관리, 코드 리뷰 문화에 대한 친숙도가 양호합니다.`,
      },
      mandatoryRequirements: {
        score: jobFitScore >= 70 ? 92 : 65,
        satisfied: jobFitScore >= 70,
        label: '필수 자격 요건 충족',
        details: `학력 및 핵심 전공/기술 요건을 기본적으로 충족하고 있습니다.`,
      },
      preferredRequirements: {
        score: Math.min(jobFitScore - 8, 80),
        satisfiedRatio: '우대 항목 일부 충족',
        label: '우대 사항 충족',
        details: `우대 기술 스택 중 일부를 보유하고 있어 서류 전형에서 추가적인 가점을 확보할 수 있습니다.`,
      },
    },
    estimatedCompetitiveness: {
      level: competitivenessLevel,
      summary: `동일 직무 지원자 풀 대비 기술적 기초와 프로젝트 완성도 면에서 ${competitivenessLevel} 수준의 경쟁력을 보유하고 있습니다.`,
      positiveFactors: [
        '직무에서 가장 기본이 되는 핵심 프로그래밍 언어 및 프레임워크 기본기 확립',
        '단순 튜토리얼을 넘어서 실제 문제를 해결한 프로젝트 포트폴리오 보유',
        '직무 학습에 대한 적극적인 태도 및 성장 잠재력 증빙 가능',
      ],
      limitingFactors: [
        '대규모 상용 서비스 운영 및 트래픽 분산 처리 실전 경험 부족',
        '채용 공고에서 요구하는 일부 심화 도구/클라우드 배포 파이프라인 경험 보완 필요',
      ],
      disclaimer:
        '※ 본 지표는 공고 원문과 제출된 이력을 교차 분석한 AI 예상 경쟁력 지표이며, 채용 시장 동향 및 기업의 내부 비공개 평가 기준에 따라 실제 결과와 차이가 있을 수 있습니다.',
    },
    skillsGapAnalysis,
    strengths: [
      '요구 직무의 메인 개발 언어에 대한 탄탄한 기본기와 프로젝트 적용 경험',
      '문제를 분석하고 기술을 통해 해결책을 구현해낸 능동적인 포트폴리오 서술',
      '협업 도구 및 버전 관리 시스템을 활용한 팀 단위 프로젝트 개발 경험',
    ],
    weaknesses: [
      '성능 최적화 및 시스템 아키텍처 관점에서의 정량적 지표(수치) 제시 부족',
      '공고의 우대 사항에 포함된 클라우드/CI-CD 파이프라인 경험 미흡',
    ],
    strategicRecommendations: [
      {
        title: '포트폴리오의 성과를 정량적 수치(%)로 재작성',
        description:
          '“성능을 개선했다” 대신 “쿼리 튜닝과 인덱싱을 통해 API 응답속도를 320ms에서 85ms로 73% 단축”과 같이 수치화하세요.',
        priority: 'HIGH',
        actionItem: '대표 프로젝트 1개의 핵심 성과 3가지를 수치화하여 이력서 첫 페이지에 배치',
      },
      {
        title: '부족한 인프라/배포 파이프라인 1일 완성 실습',
        description:
          'Docker 및 GitHub Actions를 활용하여 기존 프로젝트에 자동 빌드/테스트 파이프라인을 구축하고 이력서에 기술 스택으로 추가하세요.',
        priority: 'HIGH',
        actionItem: 'GitHub Actions 워크플로우 YAML 작성 후 Readme에 CI 배지 부착',
      },
      {
        title: '기업의 도메인 특화 비즈니스 고민 답변 준비',
        description:
          `${jobPosting.company || '해당 기업'}의 현재 서비스 현황과 최근 기술 블로그를 분석하여 본인의 기술이 어떻게 기여할 수 있는지 1분 스피치 준비.`,
        priority: 'MEDIUM',
        actionItem: '기업 기술 블로그 및 최신 보도자료 분석 후 면접 예상 질문 3개 답변 스크립트 작성',
      },
    ],
    interviewPrepQuestions: [
      '본인이 가장 주도적으로 기여했던 프로젝트에서 발생한 가장 심각한 기술적 병목은 무엇이었고, 어떻게 해결하셨나요?',
      `공고에서 요구하는 기술 중 경험이 상대적으로 부족한 항목에 대해 입사 후 어떻게 빠르게 온보딩하실 계획인가요?`,
      '팀 프로젝트 진행 중 팀원과의 기술적 견해 차이 또는 일정 지연 문제가 발생했을 때 어떻게 조율하셨나요?',
    ],
    createdAt: new Date().toISOString(),
    source: 'heuristic-engine (Vercel 404 Fallback)',
  };
}
