export enum QuestionType {
  TRUE_FALSE = "TRUE_FALSE",
  CHOICE = "CHOICE",
  FILL_BLANKS = "FILL_BLANKS",
  MATCHING = "MATCHING"
}


/* Create page */

export interface CreateQuestionData {
  id?: number;
  type: QuestionType;
  code: string;
  text: string;
  correctAnswerTipText: string;
  incorrectAnswerTipText: string;
  coursesIds: number[]; 
  language_fk: number;
  isMultipleChoice?: boolean;
  isCorrect?: boolean;
  isDragWords?: boolean;
  options?: {
    id: number;
    text: string;
    isCorrect: boolean
  }[];
  isWithTiming: boolean;
  duration?: number;
}

export interface Text {
  blocks: Block[];
}


/* Play page & Questions list page */

export interface Option {
  id: number;
  text: string;
  isSelected: boolean;
}

export interface Block {
  word: string;
  specialCharacter?: string;
  isSelected: boolean;
}

export interface Course {
  id: number;
  name: string;
  checked?: boolean;
}

export interface HiddenWord {
  word : string;
  isDraggable: boolean 
}

export interface QuestionObj {
  question: {
    id: number;
    code: string;
    text: string;
    correctAnswerTipText: string;
    incorrectAnswerTipText: string;
    courses: Course[];
    options?: Option[];
    isMultipleChoice?: boolean;
    isDragWords?: boolean;
    hiddenWords?: HiddenWord[];
    textBlocks: Block[];
    isCorrect: boolean;
    isValidate?: boolean;
    isWithTiming: boolean;
    duration: number;
    language: Language[];
  };
  type: QuestionType;
  responses?: string[]; //!
}

export interface Language {
  id: number;
  name: string;
}

export interface SelectedBlockInfo {
  questionId: number;
  blocks: { id: number; word: string }[];
}

export interface Exam {
  sessionId: number;
  examSessionEndDate: Date | null;
}