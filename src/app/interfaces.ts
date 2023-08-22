export enum QuestionType {
  TRUE_FALSE = "TRUE_FALSE",
  CHOICE = "CHOICE",
  FILL_BLANKS = "FILL_BLANKS",
  MATCHING = "MATCHING"
}

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