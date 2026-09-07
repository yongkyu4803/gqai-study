export const LEARNING_PATHS = [
  "공통 입문",
  "업무 효율화",
  "사이드 프로젝트",
  "자료 수집·분석",
  "창작 탐색",
  "공유·협업",
] as const;

export type LearningPath = (typeof LEARNING_PATHS)[number];

export const LEARNING_PATH_SEQUENCES: Record<LearningPath, string[]> = {
  "공통 입문": ["AI와 친해지기", "AI와 외부 서비스 연결하기", "업무 해체하기"],
  "업무 효율화": [
    "업무 해체하기",
    "폴더 자료를 AI와 활용하기",
    "스킬 익히기",
    "자동화 기본기",
  ],
  "사이드 프로젝트": [
    "HTML+CSS로 웹페이지 만들기",
    "첫 배포",
    "데이터베이스 입문",
  ],
  "자료 수집·분석": [
    "NotebookLM으로 자료 분석하기",
    "폴더 자료를 AI와 활용하기",
    "데이터베이스 입문",
    "웹크롤링",
    "자동화 기본기",
  ],
  "창작 탐색": ["음악 만들어보기"],
  "공유·협업": ["스킬 익히기", "스킬 공유하기"],
};

export function getLearningPaths(tags: string[]) {
  return tags
    .filter((tag) => tag.startsWith("경로: "))
    .map((tag) => tag.slice("경로: ".length))
    .filter((path): path is LearningPath =>
      LEARNING_PATHS.includes(path as LearningPath),
    );
}

export function getSuggestedNextModuleTitles(
  currentTitle: string,
  paths: readonly LearningPath[] = LEARNING_PATHS,
) {
  const suggestions = new Set<string>();
  for (const path of paths) {
    const sequence = LEARNING_PATH_SEQUENCES[path];
    const index = sequence.indexOf(currentTitle);
    if (index >= 0 && sequence[index + 1]) suggestions.add(sequence[index + 1]);
  }
  return [...suggestions];
}
