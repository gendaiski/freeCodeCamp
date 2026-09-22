/** The IDE tracks: 18 programming languages + 2 agentic-AI tracks. */
export type GradingModel = 'stdio' | 'browser' | 'structural';

export interface IdeLanguage {
  slug: string;
  name: string;
  short: string;
  monaco: string;
  judge0Id: number | null;      // Judge0 CE 1.13.x language id; null = not executed by Judge0
  grading: GradingModel;
  agentic: boolean;
  sequence: [string, string, string]; // the three exercise names shown on the launcher tile
  fileName: string;
}

export const LANGUAGES: readonly IdeLanguage[] = [
  { slug: 'html', name: 'HTML & CSS', short: 'HTML', monaco: 'html', judge0Id: null, grading: 'browser', agentic: false, sequence: ['Headings', 'Styling', 'Law firm landing page'], fileName: 'index.html' },
  { slug: 'javascript', name: 'JavaScript', short: 'JS', monaco: 'javascript', judge0Id: 63, grading: 'stdio', agentic: false, sequence: ['Console', 'Variables', 'IP Clause Validator'], fileName: 'main.js' },
  { slug: 'python', name: 'Python', short: 'Py', monaco: 'python', judge0Id: 71, grading: 'stdio', agentic: false, sequence: ['Print', 'If', 'Limitation Period Calculator'], fileName: 'main.py' },
  { slug: 'sql', name: 'SQL', short: 'SQL', monaco: 'sql', judge0Id: 82, grading: 'stdio', agentic: false, sequence: ['SELECT', 'WHERE', 'Expiring Contracts'], fileName: 'query.sql' },
  { slug: 'java', name: 'Java', short: 'Java', monaco: 'java', judge0Id: 62, grading: 'stdio', agentic: false, sequence: ['Println', 'Variables', 'Contract model'], fileName: 'Main.java' },
  { slug: 'csharp', name: 'C#', short: 'C#', monaco: 'csharp', judge0Id: 51, grading: 'stdio', agentic: false, sequence: ['WriteLine', 'Strings', 'Refund rule'], fileName: 'Program.cs' },
  { slug: 'cpp', name: 'C++', short: 'C++', monaco: 'cpp', judge0Id: 54, grading: 'stdio', agentic: false, sequence: ['cout', 'Arithmetic', 'Court Fee Calculator'], fileName: 'main.cpp' },
  { slug: 'c', name: 'C', short: 'C', monaco: 'c', judge0Id: 50, grading: 'stdio', agentic: false, sequence: ['printf', '%d', 'Deadline Days'], fileName: 'main.c' },
  { slug: 'go', name: 'Go', short: 'Go', monaco: 'go', judge0Id: 60, grading: 'stdio', agentic: false, sequence: ['Println', ':=', 'NDA Screener'], fileName: 'main.go' },
  { slug: 'php', name: 'PHP', short: 'PHP', monaco: 'php', judge0Id: 68, grading: 'stdio', agentic: false, sequence: ['echo', 'Variables', 'E-Shop Refund Rule'], fileName: 'index.php' },
  { slug: 'r', name: 'R', short: 'R', monaco: 'r', judge0Id: 80, grading: 'stdio', agentic: false, sequence: ['print', 'Vectors', 'Case Duration Analytics'], fileName: 'main.R' },
  { slug: 'dart', name: 'Dart', short: 'Dart', monaco: 'dart', judge0Id: null, grading: 'stdio', agentic: false, sequence: ['print', 'Interpolation', 'Client Intake Model'], fileName: 'main.dart' },
  { slug: 'typescript', name: 'TypeScript', short: 'TS', monaco: 'typescript', judge0Id: 74, grading: 'stdio', agentic: false, sequence: ['Types', 'Functions', 'Typed Contract Portfolio'], fileName: 'main.ts' },
  { slug: 'ruby', name: 'Ruby', short: 'Rb', monaco: 'ruby', judge0Id: 72, grading: 'stdio', agentic: false, sequence: ['puts', 'Variables', 'Refund Predicate'], fileName: 'main.rb' },
  { slug: 'rust', name: 'Rust', short: 'Rs', monaco: 'rust', judge0Id: 73, grading: 'stdio', agentic: false, sequence: ['println!', 'Types', 'Deadline Function'], fileName: 'main.rs' },
  { slug: 'kotlin', name: 'Kotlin', short: 'Kt', monaco: 'kotlin', judge0Id: 78, grading: 'stdio', agentic: false, sequence: ['println', 'Templates', 'Contract Check'], fileName: 'Main.kt' },
  { slug: 'swift', name: 'Swift', short: 'Sw', monaco: 'swift', judge0Id: 83, grading: 'stdio', agentic: false, sequence: ['print', 'Constants', 'Refund Function'], fileName: 'main.swift' },
  { slug: 'n8n', name: 'n8n Automation', short: 'n8n', monaco: 'json', judge0Id: null, grading: 'structural', agentic: true, sequence: ['Workflow JSON', 'IF logic', 'Client Intake Pipeline'], fileName: 'workflow.json' },
  { slug: 'cursor', name: 'Cursor — AI IDE', short: 'Cur', monaco: 'markdown', judge0Id: null, grading: 'structural', agentic: true, sequence: ['.cursorrules', 'Agent prompts', 'Agent Task Spec'], fileName: '.cursorrules' }
] as const;

export const PROGRAMMING_LANGUAGE_COUNT = LANGUAGES.filter((l) => !l.agentic).length + 1; // 18: HTML and CSS count separately
export const AGENTIC_TRACK_COUNT = LANGUAGES.filter((l) => l.agentic).length; // 2
export const TRACK_COUNT = LANGUAGES.length; // 19 launcher tiles
export const EXERCISES_PER_TRACK = 3;

export function findLanguage(slug: string): IdeLanguage | undefined {
  return LANGUAGES.find((l) => l.slug === slug);
}
