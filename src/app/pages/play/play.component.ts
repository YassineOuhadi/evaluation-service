import { Subscription, interval } from 'rxjs';
import { ElementRef } from '@angular/core';
import { Observable } from 'rxjs';
import { Component, HostListener, OnInit, ViewChild } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { trigger, state, style, transition, animate } from '@angular/animations';
import { AppService } from '../../app.service';
import { ActivatedRoute } from '@angular/router';
import { Router } from '@angular/router'; 
import { MatSnackBar } from '@angular/material/snack-bar';

import {
  QuestionType,
  Option,
  Block,
  Course,
  HiddenWord,
  QuestionObj,
  SelectedBlockInfo,
  Language,
  Exam
} from '../../interfaces';

@Component({
  selector: 'app-quiz-play',
  templateUrl: './play.component.html',
  styleUrls: ['./play.component.css'],
  animations: [
    trigger('fadeInOut', [
      state('void', style({ opacity: 0 })),
      transition(':enter, :leave', animate(200))
    ]),
    trigger('slideDownUp', [
      transition(':enter', [
        style({ height: 0, opacity: 0 }),
        animate('100ms ease-out', style({ height: '*', opacity: 1 })),
      ]),
      transition(':leave', [
        style({ height: '*', opacity: 1 }),
        animate('100ms ease-in', style({ height: 0, opacity: 0 })),
      ]),
    ]),
  ]
})

export class PlayComponent implements OnInit {

  currentLanguage = 'en';
  loadingDuration = 2000;

  content: any;
  isMiniQuiz: boolean = false;
  showWarning: boolean = true;
  isQuizStarted: boolean = false;
  isQuizEnded: boolean = false;
  questionsList: QuestionObj[] = [];
  currentQuestionNo: number = 0;

  timer = interval(1000);
  subscription: Subscription[] = [];
  currentDraggedWord: HiddenWord | null = null;
  currentDroppedWord: HiddenWord | null = null;


  courseId: number; // mini quiz
  campaignProgressId: number; // final exam

  isUserCanTakeExam: boolean = false;
  totalQuestions: number = 0;
  score: number = 0;
  isArchived: boolean = false;

  constructor(
    private http: HttpClient,
    private elementRef: ElementRef,
    private apiService: AppService, 
    private snackBar: MatSnackBar,
    private route: ActivatedRoute,
    private router: Router) {
    this.http.get("assets/json/play.json").subscribe((res: any) => {
      //debugger;
      this.content = res;
    });
    this.campaignProgressId = 1;
    this.courseId = 1;
  }

  ngOnInit(): void {
    this.route.queryParams.subscribe(params => {
      this.isMiniQuiz = params['isMiniQuiz'] === 'true';
    });

    if (this.isMiniQuiz) {
      this.startQuiz();
    } else {
      this.apiService.canTakeExam(this.campaignProgressId).subscribe(
        (response: any) => {
          this.isUserCanTakeExam = response.isUserCanTakeExam;
          if (this.isUserCanTakeExam) {
            this.totalQuestions = response.totalQuestions;
          } else {
            this.router.navigateByUrl('/');
          }
        },
        (error) => {
          console.error('Error while checking if user can take the exam:', error);
        }
      );
    }
  }

  ngOnDestroy() {
    //alert("Are you sure you want to leave? Your progress may be lost.");
    if (this.subscription) {
      this.subscription.forEach(element => {
        element.unsubscribe();
        this.finish();
      });
    }
  }

  /**/

  showWarningPopup() {
    this.showWarning = true;
  }

  getLayoutDirection(): string {
    return this.currentLanguage === 'ar' ? 'rtl' : 'ltr';
  }

  rightToLeft(): boolean {
    return this.currentLanguage !== 'ar';
  }

  changeLanguage(language: string) {
    this.currentLanguage = language;
  }

  getDropHereTranslation(): string {
    const dropHereTranslations = this.content.buttons.dropHere;
    const currentLanguage = this.currentLanguage || 'en';
    return dropHereTranslations[currentLanguage];
  }

  calculateInputWidth(block: Block): string {
    if (!block.word) return '100px';
    const wordLength = block.word.length;
    const averageCharacterWidth = 7.64;
    const minWidth = 20;
    const calculatedWidth = Math.max(wordLength * averageCharacterWidth, minWidth);
    return `${calculatedWidth}px`;
  }

  parseTextIntoBlocks(text: string): Block[] {
    const blocks: Block[] = [];
    const wordRegex = /\*\*.*?\*\*|\S+/g;
    const words = text.match(wordRegex) || [];
    let wordBuffer = '';
    let specialCharacter: string | undefined = undefined;
    let isSelected = false;
    const specialCharacters = [',', '.', ':', ';'];
    for (let i = 0; i < words.length; i++) {
      var word = words[i];
      if (word.startsWith('**')) {
        if (word.endsWith('**')) {
          const trimmedWord = word.substring(2, word.length - 2);
          blocks.push({ word: trimmedWord, specialCharacter, isSelected: true });
        }
        else if (specialCharacters.some(specialChar => word.endsWith(`**${specialChar}`))) {
          const trimmedWord = word.substring(2, word.length - 3);
          const lastChar = word[word.length - 1];
          specialCharacter = specialCharacters.includes(lastChar) ? lastChar : undefined;
          blocks.push({ word: trimmedWord, specialCharacter, isSelected: true });
        }
        else {
          wordBuffer = word.substring(2);
          isSelected = true;
        }
      }
      else if (word.endsWith('**')) {
        wordBuffer += ` ${word.substring(0, word.length - 2)}`;
        const lastChar = word[word.length - 1]; // Check the character before **
        specialCharacter = specialCharacters.includes(lastChar) ? lastChar : undefined;
        blocks.push({ word: wordBuffer.trim(), specialCharacter, isSelected: true });
        wordBuffer = '';
        isSelected = false;
        // Handle the special character after **
        const afterDoubleAsterisk = word.substring(word.length - 1);
        if (specialCharacters.includes(afterDoubleAsterisk)) {
          specialCharacter = afterDoubleAsterisk;
          blocks.push({ word: '', specialCharacter, isSelected: false });
        }
      }
      else if (specialCharacters.some(specialChar => word.endsWith(`**${specialChar}`))) {
        wordBuffer += ` ${word.substring(0, word.length - 3)}`;
        const lastChar = word[word.length - 1]; // Check the character before **
        specialCharacter = specialCharacters.includes(lastChar) ? lastChar : undefined;
        blocks.push({ word: wordBuffer.trim(), specialCharacter, isSelected: true });
        wordBuffer = '';
        isSelected = false;
        // Handle the special character after **
        const afterDoubleAsterisk = word.substring(word.length - 11);
        if (specialCharacters.includes(afterDoubleAsterisk)) {
          specialCharacter = afterDoubleAsterisk;
          blocks.push({ word: '', specialCharacter, isSelected: false });
        }
      }
      else if (isSelected) {
        wordBuffer += ` ${word}`;
      }
      else {
        const lastChar = word[word.length - 1];
        specialCharacter = specialCharacters.includes(lastChar) ? lastChar : undefined;
        if (specialCharacter) {
          word = word.substring(0, word.length - 1);
        }
        blocks.push({ word, specialCharacter, isSelected: false });
      }
    }
    if (wordBuffer !== '') {
      blocks.push({ word: wordBuffer.trim(), isSelected });
    }
    return blocks;
  }

  onTextareaInput() {
    if (this.questionsList[this.currentQuestionNo].type !== QuestionType.FILL_BLANKS) return;
    if (this.questionsList[this.currentQuestionNo].isDragWords) return;
    this.isMiniQuiz ? this.onRetry() : null;
  }

  refreshDragDropContent(question: QuestionObj) {
    if (question.type === QuestionType.FILL_BLANKS && question.isDragWords) {
      this.currentDroppedWord = null;
      question.textBlocks.filter((o: any) => o.isSelected == true).forEach((block) => (block.word = ''));
      question.hiddenWords?.forEach((hiddenWord: HiddenWord) => {
        hiddenWord.isDraggable = true;
      })
      if (question.isCorrect) {
        question.isCorrect = !question.isCorrect;
        question.isValidate = false;
      }
    }
  }

  hasDraggableHiddenWords(): boolean {
    const question = this.questionsList[this.currentQuestionNo];
    return question?.hiddenWords?.some(word => word.isDraggable) || false;
  }

  onDragStart(event: DragEvent, dragWord: HiddenWord) {
    this.currentDraggedWord = dragWord;
    const draggedElement = event.target as HTMLElement;
    draggedElement.classList.add('dragged-word');
  }

  onClickStart(dragWord: HiddenWord) {
    this.currentDraggedWord = dragWord;
  }

  onClickEnd() { }

  onDragOver(event: DragEvent) {
    event.preventDefault();
  }

  onDrop(event: DragEvent, block: Block) {
    event.preventDefault();
    if (this.questionsList[this.currentQuestionNo].type !== QuestionType.FILL_BLANKS || !this.currentDraggedWord) return;
    const dropElement = event.target as HTMLElement;
    const draggedWord = this.currentDraggedWord.word;
    if (dropElement.tagName.toLowerCase() === 'span' && this.currentDraggedWord.isDraggable) {
      const existingWord = dropElement.textContent?.trim() || '';
      if (existingWord !== '') {
        block.word = '';
        if (this.currentDroppedWord) {
          this.currentDroppedWord.isDraggable = true;
        }
      }
      block.word = draggedWord;
      this.currentDroppedWord = this.currentDraggedWord;
      this.currentDraggedWord.isDraggable = false;
    }
    this.isMiniQuiz ? this.onRetry() : null;
  }

  selectOption(option: any) {
    if (this.questionsList[this.currentQuestionNo].type === QuestionType.CHOICE && this.questionsList[this.currentQuestionNo].isMultipleChoice)
      option.isSelected = !option.isSelected;
    else if ((this.questionsList[this.currentQuestionNo].type === QuestionType.CHOICE && !this.questionsList[this.currentQuestionNo].isMultipleChoice) || (this.questionsList[this.currentQuestionNo].type === QuestionType.TRUE_FALSE)) {
      if (option.isSelected) return;
      if (this.questionsList[this.currentQuestionNo].type === QuestionType.TRUE_FALSE) {
        this.questionsList[this.currentQuestionNo].options?.filter((m: any) => m.isSelected == true).forEach((o: any) => o.isSelected = false);
        option.isSelected = !option.isSelected;
      } else {
        this.questionsList[this.currentQuestionNo].options?.filter((m: any) => m.isSelected == true).forEach((o: any) => o.isSelected = false);
        option.isSelected = !option.isSelected;
      }
    }
    this.isMiniQuiz ? this.onRetry() : null;
  }

  isOptionSelected(options: any) {
    return options.filter((m: any) => m.isSelected == true).length !== 0;
  }

  getInfoResponse(): any {
    if (this.questionsList[this.currentQuestionNo].type === QuestionType.FILL_BLANKS) {
      const selectedBlocks: {
        blockNumber: number;
        text: string
      }[] = [];
      let blockNumber = 1;
      for (const block of this.questionsList[this.currentQuestionNo].textBlocks) {
        if (block.isSelected) {
          selectedBlocks.push({ blockNumber: blockNumber++, text: block.word });
        }
      }
      const data: {
        questionId: number;
        blocks: {
          blockNumber: number;
          text: string
        }[]
      } = {
        questionId: this.questionsList[this.currentQuestionNo].id,
        blocks: selectedBlocks,
      };
      return data;
    } else if (this.questionsList[this.currentQuestionNo].type === QuestionType.CHOICE) {
      if (this.questionsList[this.currentQuestionNo].isMultipleChoice) {
        const optionsData: {
          id: number;
          isCorrect: boolean
        }[] = this.questionsList[this.currentQuestionNo].options?.map((opt) => ({
          id: opt.id,
          isCorrect: opt.isSelected,
        })) || [];
        const data: {
          questionId: number;
          options: {
            id: number;
            isCorrect: boolean
          }[]
        } = {
          questionId: this.questionsList[this.currentQuestionNo].id,
          options: optionsData,
        };
        return data;
      } else {
        const optionsData: {
          id: number;
          isCorrect: boolean
        }[] = this.questionsList[this.currentQuestionNo].options?.map((opt) => ({
          id: opt.id,
          isCorrect: opt.isSelected,
        })) || [];
        const data: {
          questionId: number;
          options: {
            id: number;
            isCorrect: boolean
          }[]
        } = {
          questionId: this.questionsList[this.currentQuestionNo].id,
          options: optionsData,
        };
        return data;
      }
    } else if (this.questionsList[this.currentQuestionNo].type === QuestionType.TRUE_FALSE) {
      const selectedOption = this.questionsList[this.currentQuestionNo].options?.find((o: any) => o.isSelected);
      const data: { questionId: number; isCorrect: boolean | null } = {
        questionId: this.questionsList[this.currentQuestionNo].id,
        isCorrect: selectedOption ? selectedOption.text.toLowerCase() === 'true' : null,
      };
      return data;
    }
  }

  /**/

  showToast(messageKey: string, languageCode: string): void {
    let message = this.content.messages[messageKey][languageCode];
    this.snackBar.open(message, this.content.messages.close[languageCode], {
      duration: this.loadingDuration,
      horizontalPosition: 'center',
      verticalPosition: 'bottom',
    });
  }

  startQuiz() {
    this.isQuizEnded = false;
    this.showWarning = false;
    this.isQuizStarted = true;

    if (this.isMiniQuiz) {
      this.loadQuestions(this.courseId);
    } else {
      const data: { campaignProgressId: number; } = {
        campaignProgressId: this.campaignProgressId
      };
      this.beginExam(data);
    }
  }

  stop() {
    this.isQuizStarted = false;
    this.showWarningPopup();
  }

  ContinueQuiz() {
    if (this.isMiniQuiz || (!this.isMiniQuiz && this.questionsList.length > 0)) {
      this.isQuizEnded = false;
      this.showWarning = false;
      this.isQuizStarted = true;
    } else {
      this.startQuiz();
    }
  }

  ReplayQuiz() {
    if (!this.isMiniQuiz) {
      this.retryAgain();
    }
    this.currentQuestionNo = 0;
    this.isQuizEnded = false;
    this.showWarning = false;
    this.isQuizStarted = true;
  }

  finish() {
    console.log(this.questionsList);
    if (!this.isMiniQuiz) {
      this.apiService.quitExam(this.campaignProgressId).subscribe(
        (response) => {
          this.score = response.score;
          this.isArchived = response.isArchived;
          this.currentQuestionNo = 0;
          this.isQuizEnded = true;
          this.isQuizStarted = false;
        },
        (error) => {
          console.error('Error', error);
        }
      );
    } else {
      this.currentQuestionNo = 0;
      this.isQuizEnded = true;
      this.isQuizStarted = false;
    }
  }

  exit() {
    this.router.navigateByUrl('/');
  }

  /* Mini quiz */

  loadQuestions(courseId: number) {
    this.apiService.getQuestionsByCourse(courseId).subscribe(
      (response) => {
        this.questionsList = response.map((item: any) => {

          if (item.type === QuestionType.TRUE_FALSE) {
            item.options = [
              { id: 1, text: "True", isSelected: false },
              { id: 2, text: "False", isSelected: false },
            ];
          }

          if (item.type === QuestionType.FILL_BLANKS) {
            item.textBlocks = this.parseTextIntoBlocks(item.text);
          }

          if ((item.type === QuestionType.FILL_BLANKS) && (item.isDragWords)) {
            if (item.hiddenWords) {
              const hiddenWords = item.hiddenWords.map((word: string) => {
                return {
                  word: word,
                  isDraggable: true,
                };
              });
              item.hiddenWords = hiddenWords;
            }
          }

          if (item.options) {
            item.options.forEach((option: Option) => {
              option.isSelected = false;
            });
          }

          item.isCorrect = false;

          if (this.isMiniQuiz) {
            item.isValidate = false;
          }

          return item;
        });
        console.log(this.questionsList);
      },
      (error) => {
        console.error('Error while fetching questions data:', error);
      }
    );
  }

  validateAnswer() {
    //
    if (!this.isAnswered()) {
      this.showToast('PLEASEANSWERQUESTION', this.currentLanguage);
      return;
    }
    //
    this.isMiniQuiz ? this.validateUserResponse(this.getInfoResponse()) : null;
  }

  retryAgain() {
    this.questionsList.forEach(questionData => {
      if ((questionData.type === QuestionType.CHOICE || questionData.type === QuestionType.TRUE_FALSE) && questionData.options) {
        questionData.options.forEach((option) => {
          option.isSelected = false;
        });
      } else if (questionData.type === QuestionType.FILL_BLANKS && questionData.isDragWords) {
        this.refreshDragDropContent(questionData);
      } else if (questionData.type === QuestionType.FILL_BLANKS && !questionData.isDragWords) {
        questionData.textBlocks.forEach((block) => {
          if (block.isSelected) block.word = '';
        });
      }
    });
    //this.isMiniQuiz ? this.onRetry() : null;
  }

  onRetry() {
    this.questionsList[this.currentQuestionNo].isValidate = false;
  }

  validateUserResponse(data: any): void {
    this.validateResponseObservable(data).subscribe((isCorrect: boolean) => {
      if (this.questionsList[this.currentQuestionNo].isCorrect && !isCorrect) {
        this.questionsList[this.currentQuestionNo].isCorrect = !this.questionsList[this.currentQuestionNo].isCorrect;
      } else if (isCorrect && !this.questionsList[this.currentQuestionNo].isCorrect) {
        this.questionsList[this.currentQuestionNo].isCorrect = !this.questionsList[this.currentQuestionNo].isCorrect;
      };
      this.isMiniQuiz ? (this.questionsList[this.currentQuestionNo].isValidate = true) : null;
    });
  }

  validateResponseObservable(data: any): Observable<boolean> {
    return new Observable<boolean>((observer) => {
      this.apiService.validateResponse(data).subscribe(
        (response) => {
          console.log(response);
          const isCorrectAnswer = response.isCorrectAnswer;
          this.questionsList.forEach((questionObj) => {
            if (questionObj.id === data.questionId) {
              questionObj.responses = response.responseList;
            }
          });
          observer.next(isCorrectAnswer === true);
          observer.complete();
        },
        (error) => {
          console.error('Error while fetching questions data:', error);
          observer.next(false);
          observer.complete();
        }
      );
    });
  }

  isAnswered(): boolean {
    const question = this.questionsList[this.currentQuestionNo];
    if (question.type === QuestionType.CHOICE) {
      return question.options?.some((option: Option) => option.isSelected === true) || false;
    } else if (question.type === QuestionType.TRUE_FALSE) {
      return question.options?.some((option: Option) => option.isSelected === true) || false;
    } else if (question.type === QuestionType.FILL_BLANKS) {
      //return question.textBlocks.every((block: Block) => !!block.word);
      const selectedBlocks = question.textBlocks.filter((block: Block) => block.isSelected);
      return selectedBlocks.every((block: Block) => !!block.word);
    }
    return false;
  }

  nextQuestion() {
    //
    if (!this.isAnswered()) {
      this.showToast('PLEASEANSWERQUESTION', this.currentLanguage);
      return;
    }
    //
    if (this.isMiniQuiz) this.moveToNextQuestion();
    else this.validateAndProceed();
  }

  previewQuestion() {
    if (this.currentQuestionNo > 0) {
      this.currentQuestionNo--;
      this.questionsList[this.currentQuestionNo].isValidate = false;
    }
  }

  moveToNextQuestion() {
    if (this.isMiniQuiz) {
      if (this.currentQuestionNo < this.questionsList.length - 1) {
        this.currentQuestionNo++;
      } else {
        this.subscription.forEach(element => {
          element.unsubscribe();
          this.finish();
        });
      }
    } else {
      if (this.currentQuestionNo < this.questionsList.length - 1) {
        this.currentQuestionNo++;
      } else {
        this.finish();
      }
    }
  }

  validateAndProceed() {
    if (this.isMiniQuiz) return this.finish();
    const data = {
      campaignProgressId: this.campaignProgressId,
      ...this.getInfoResponse()
    };
    this.apiService.validateQuestion(data).subscribe(
      (response) => {
        console.log(response);
        const isCorrectAnswer = response.isCorrectAnswer;
        this.questionsList.forEach((questionObj) => {
          this.questionsList[this.currentQuestionNo].isCorrect = isCorrectAnswer === true;
          if (questionObj.id === data.questionId) {
            questionObj.responses = response.responseList;
          }
        });
        this.moveToNextQuestion();
      },
      (error) => {
        console.error('Error', error);
      }
    );
  }

  /* Final exam */

  beginExam(data: { campaignProgressId: number; }) {
    this.apiService.beginExam(data).subscribe(
      (response) => {
        console.log(response);
        this.questionsList = response.map((item: any) => {

          if (item.type === QuestionType.TRUE_FALSE) {
            item.options = [
              { id: 1, text: "True", isSelected: false },
              { id: 2, text: "False", isSelected: false },
            ];
          }

          if (item.type === QuestionType.FILL_BLANKS) {
            item.textBlocks = this.parseTextIntoBlocks(item.text);
          }

          if ((item.type === QuestionType.FILL_BLANKS) && (item.isDragWords)) {
            if (item.hiddenWords) {
              const hiddenWords = item.hiddenWords.map((word: string) => {
                return {
                  word: word,
                  isDraggable: true,
                };
              });
              item.hiddenWords = hiddenWords;
            }
          }

          if (item.options) {
            item.options.forEach((option: Option) => {
              option.isSelected = false;
            });
          }

          item.isCorrect = false;

          if (this.isMiniQuiz) {
            item.isValidate = false;
          }

          return item;
        });

        console.log(this.questionsList);
      },
      (error) => {
        console.error('Error while fetching questions data:', error);
      }
    );
  }

  getCertification(): string {
    if (this.isMiniQuiz) return '';
    if (this.isArchived) {
      if (this.score > 80) {
        return '/assets/cybersecurity_badges_golde.png';
      } else {
        return '/assets/cybersecurity_badges_blue.png';
      }
    } else {
      return '/assets/cybersecurity_badges_red.png';
    }
  }
}