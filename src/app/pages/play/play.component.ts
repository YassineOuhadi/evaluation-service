import { Subscription, interval } from 'rxjs';
import { ElementRef } from '@angular/core';
import { Observable } from 'rxjs';
import { Component, HostListener, OnInit, ViewChild } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { trigger, state, style, transition, animate } from '@angular/animations';
import { AppService } from '../../app.service';
import { ActivatedRoute } from '@angular/router';
import { map, catchError } from 'rxjs/operators';
import { of } from 'rxjs';
import { Router } from '@angular/router';
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
      transition(':enter, :leave', animate(200)) // Adjust the duration as needed
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
  content: any;
  isMiniQuiz: boolean = false;
  showWarning: boolean = true;
  isQuizStarted: boolean = false;
  isQuizEnded: boolean = false;
  questionsList: QuestionObj[] = [];
  currentQuestionNo: number = 0;
  remainingTime: number = 0;
  timer = interval(1000);
  subscription: Subscription[] = [];
  correctAnswerCount: number = 0;
  currentDraggedWord: HiddenWord | null = null;
  currentDroppedWord: HiddenWord | null = null;
  courseId: number; // mini quiz
  userId: number; // final exam
  campaignId: number;
  examSession: Exam = {
    sessionId: 0,
    examSessionEndDate: null,
  };
  isUserCanTakeExam: boolean = false;
  totalQuestions: number = 0;
  isContinueExam: boolean = false;
  nbQuestionsAttempted?: number = 0;

  score: number = 0;
  isArchived: boolean = false;

  constructor(
    private http: HttpClient,
    private elementRef: ElementRef,
    private apiService: AppService,
    private route: ActivatedRoute,
    private router: Router) {
    this.http.get("assets/playConstants.json").subscribe((res: any) => {
      //debugger;
      this.content = res;
    });
    this.userId = 1;
    this.campaignId = 1;
    this.courseId = 1;
  }

  ngOnInit(): void {
    this.route.queryParams.subscribe(params => {
      this.isMiniQuiz = params['isMiniQuiz'] === 'true';
    });

    if (!this.isMiniQuiz) {
      this.apiService.canTakeExam(this.campaignId, this.userId).subscribe(
        (response: any) => {
          this.isUserCanTakeExam = response.isUserCanTakeExam;
          if (this.isUserCanTakeExam) {
            this.isContinueExam = response.isContinueExam;
            this.totalQuestions = response.totalQuestions;
            if (this.isContinueExam) {
              this.nbQuestionsAttempted = response.nbQuestionsAttempted;
            }
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



  @HostListener('window:beforeunload', ['$event'])
  unloadNotification($event: any): string {
    // Perform cleanup actions here
    // For example, unsubscribe from observables or release resources

    // Return a confirmation message to prompt the user
    return 'Are you sure you want to leave? Your progress may be lost.';
  }

  ngOnDestroy() {
    //alert("hh");
    if (this.subscription) {
      this.subscription.forEach(element => {
        element.unsubscribe();
        this.finish();
      });
    }
  }

  /**/

  onClickTitle() { }

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
    if (!this.questionsList[this.currentQuestionNo].question.isDragWords) return;
    this.isMiniQuiz ? (this.questionsList[this.currentQuestionNo].question.isValidate = false) : null;
  }

  refreshDragDropContent() {
    this.currentDroppedWord = null;
    this.questionsList[this.currentQuestionNo].question.textBlocks.filter((o: any) => o.isSelected == true).forEach((block) => (block.word = ''));
    this.questionsList[this.currentQuestionNo].question.hiddenWords?.forEach((hiddenWord: HiddenWord) => {
      hiddenWord.isDraggable = true;
    })
    if (this.questionsList[this.currentQuestionNo].question.isCorrect) {
      this.questionsList[this.currentQuestionNo].question.isCorrect = !this.questionsList[this.currentQuestionNo].question.isCorrect; // Reset isCorrect flag for the question
      this.correctAnswerCount--;
      this.questionsList[this.currentQuestionNo].question.isValidate = false;
    }
  }

  hasDraggableHiddenWords(): boolean {
    const question = this.questionsList[this.currentQuestionNo]?.question;
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
    this.isMiniQuiz ? (this.questionsList[this.currentQuestionNo].question.isValidate = false) : null;
  }

  selectOption(option: any) {
    if (this.questionsList[this.currentQuestionNo].type === QuestionType.CHOICE && this.questionsList[this.currentQuestionNo].question.isMultipleChoice)
      option.isSelected = !option.isSelected;
    else if ((this.questionsList[this.currentQuestionNo].type === QuestionType.CHOICE && !this.questionsList[this.currentQuestionNo].question.isMultipleChoice) || (this.questionsList[this.currentQuestionNo].type === QuestionType.TRUE_FALSE)) {
      if (option.isSelected) return;
      if (this.questionsList[this.currentQuestionNo].type === QuestionType.TRUE_FALSE) {
        this.questionsList[this.currentQuestionNo].question.options?.filter((m: any) => m.isSelected == true).forEach((o: any) => o.isSelected = false);
        option.isSelected = !option.isSelected;
      } else {
        this.questionsList[this.currentQuestionNo].question.options?.filter((m: any) => m.isSelected == true).forEach((o: any) => o.isSelected = false);
        option.isSelected = !option.isSelected;
      }
    }
    this.isMiniQuiz ? (this.questionsList[this.currentQuestionNo].question.isValidate = false) : null;
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
      for (const block of this.questionsList[this.currentQuestionNo].question.textBlocks) {
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
        questionId: this.questionsList[this.currentQuestionNo].question.id,
        blocks: selectedBlocks,
      };
      return data;
    } else if (this.questionsList[this.currentQuestionNo].type === QuestionType.CHOICE) {
      if (this.questionsList[this.currentQuestionNo].question.isMultipleChoice) {
        const optionsData: {
          id: number;
          isCorrect: boolean
        }[] = this.questionsList[this.currentQuestionNo].question.options?.map((opt) => ({
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
          questionId: this.questionsList[this.currentQuestionNo].question.id,
          options: optionsData,
        };
        return data;
      } else {
        const optionsData: {
          id: number;
          isCorrect: boolean
        }[] = this.questionsList[this.currentQuestionNo].question.options?.map((opt) => ({
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
          questionId: this.questionsList[this.currentQuestionNo].question.id,
          options: optionsData,
        };
        return data;
      }
    } else if (this.questionsList[this.currentQuestionNo].type === QuestionType.TRUE_FALSE) {
      const selectedOption = this.questionsList[this.currentQuestionNo].question.options?.find((o: any) => o.isSelected);
      if (!selectedOption) return;
      const data: { questionId: number; isCorrect: boolean } = {
        questionId: this.questionsList[this.currentQuestionNo].question.id,
        isCorrect: selectedOption.text.toLowerCase() === 'true',
      };
      return data;
    }
  }

  /**/

  start() {
    this.currentQuestionNo = 0;
    if (!this.isMiniQuiz && this.questionsList[this.currentQuestionNo].question.isWithTiming)
      this.remainingTime = this.questionsList[this.currentQuestionNo].question.duration;
    this.showWarning = false;
    this.isQuizEnded = false;
    this.isQuizStarted = false;
  }

  startQuiz() {
    this.isQuizEnded = false;
    this.showWarning = false;
    this.isQuizStarted = true;

    if (this.isMiniQuiz) {
      this.loadQuestions(this.courseId);
    } else {
      const data: { campaignId: number; userId: number; } = {
        campaignId: this.campaignId,
        userId: this.userId,
      };
      this.beginExam(data);
    }
  }

  ContinueQuiz() {
    if (this.isMiniQuiz || (!this.isMiniQuiz && this.questionsList.length > 0)) {
      this.isQuizEnded = false;
      this.showWarning = false;
      this.isQuizStarted = true;
      this.isContinueExam = false;
    } else {
      this.isContinueExam = false;
      this.startQuiz();
    }
  }

  ReplayQuiz() {
    this.currentQuestionNo = 0;
    if (this.questionsList[this.currentQuestionNo].question.isWithTiming) this.remainingTime = this.questionsList[this.currentQuestionNo].question.duration;
    this.startQuiz();
  }

  stop() {
    this.isQuizStarted = false;
    this.isContinueExam = true;
    this.showWarningPopup();
  }

  finish() {
    if (!this.isMiniQuiz) {
      this.apiService.quitExam(this.examSession.sessionId).subscribe(
        (response) => {
          this.score = response.score;
          this.isArchived = response.isArchived;
          this.questionsList.forEach((questionObj) => {
            const questionId = questionObj.question.id;
            this.getRepport(questionId).subscribe((responses) => {
              questionObj.responses = responses;
            });
          });
          // get used questions and the iscorrect question attribute
          this.currentQuestionNo = 0;
          this.isQuizEnded = true;
          this.isQuizStarted = false;
        },
        (error) => {
          console.error('Error', error);
        }
      );
    } else {
      if (this.questionsList[this.currentQuestionNo].question.isWithTiming || this.remainingTime == 0) {
        this.currentQuestionNo = 0;
        this.isQuizEnded = true;
        this.isQuizStarted = false;
      } else {
        this.isQuizStarted = false;
        this.isContinueExam = true;
        this.showWarningPopup();
      }
    }
  }

  exit() {
    this.router.navigateByUrl('/');
  }

  /* Mini quiz */

  loadQuestions(courseId: number) {
    this.apiService.getQuestionsByCourse(courseId).subscribe(
      (response) => {
        this.questionsList = response.map((item: QuestionObj) => {

          if (item.type === QuestionType.TRUE_FALSE) {
            item.question.options = [
              { id: 1, text: "True", isSelected: false },
              { id: 2, text: "False", isSelected: false },
            ];
          }

          if (item.type === QuestionType.FILL_BLANKS) {
            item.question.textBlocks = this.parseTextIntoBlocks(item.question.text);
          }

          if ((item.type === QuestionType.FILL_BLANKS) && (item.question.isDragWords)) {
            item.question.hiddenWords?.forEach((word: HiddenWord) => {
              word.isDraggable = true;
            })
          }

          if (item.question.options) {
            item.question.options.forEach((option: Option) => {
              option.isSelected = false;
            });
          }

          item.question.isCorrect = false;

          item.question.isWithTiming = item.question.isWithTiming;
          if (item.question.isWithTiming) item.question.duration = item.question.duration;

          if (this.isMiniQuiz) {
            item.question.isValidate = false;
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
    this.isMiniQuiz ? this.validateUserResponse(this.getInfoResponse()) : null;
  }

  validateUserResponse(data: any): void {
    this.validateResponseObservable(data).subscribe((isCorrect: boolean) => {
      if (this.questionsList[this.currentQuestionNo].question.isCorrect && !isCorrect) {
        this.correctAnswerCount--;
        this.questionsList[this.currentQuestionNo].question.isCorrect = !this.questionsList[this.currentQuestionNo].question.isCorrect; // Reset isCorrect flag for the question
      } else if (isCorrect && !this.questionsList[this.currentQuestionNo].question.isCorrect) {
        this.correctAnswerCount++;
        this.questionsList[this.currentQuestionNo].question.isCorrect = !this.questionsList[this.currentQuestionNo].question.isCorrect; // Set isCorrect flag for the question
      };
      this.isMiniQuiz ? (this.questionsList[this.currentQuestionNo].question.isValidate = true) : null;
      console.log(this.correctAnswerCount);
    });
  }

  validateResponseObservable(data: any): Observable<boolean> {
    return new Observable<boolean>((observer) => {
      this.apiService.validateResponse(data).subscribe(
        (response) => {
          observer.next(response === true);
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

  nextQuestion() {
    if (this.isMiniQuiz) this.moveToNextQuestion();
    else this.validateAndProceed();
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
      if (this.currentQuestionNo < this.questionsList.length - 1 && this.examSession.examSessionEndDate && this.examSession.examSessionEndDate > new Date()) {
        this.currentQuestionNo++;
        if (this.questionsList[this.currentQuestionNo].question.isWithTiming) {
          this.remainingTime = this.questionsList[this.currentQuestionNo].question.duration;
        }
      } else {
        this.subscription.forEach(element => {
          element.unsubscribe();
          this.finish();
        });
      }
    }
  }

  validateAndProceed() {
    if (this.isMiniQuiz) return this.finish();
    const data = {
      sessionId: this.examSession.sessionId,
      ...this.getInfoResponse()
    };

    this.apiService.validateQuestion(data).subscribe(
      (response) => {
        if (response === true) {
          this.correctAnswerCount--;
        } else {
          this.correctAnswerCount++;
        };
        this.questionsList[this.currentQuestionNo].question.isCorrect = response === true;
        this.moveToNextQuestion();
      },
      (error) => {
        console.error('Error', error);
      }
    );
  }

  /* Final exam */

  beginExam(data: { campaignId: number; userId: number; }) {
    this.apiService.beginExam(data).subscribe(
      (response) => {
        console.log(response);
        this.questionsList = response.questions.map((item: QuestionObj) => {

          if (item.type === QuestionType.TRUE_FALSE) {
            item.question.options = [
              { id: 1, text: "True", isSelected: false },
              { id: 2, text: "False", isSelected: false },
            ];
          }

          if (item.type === QuestionType.FILL_BLANKS) {
            item.question.textBlocks = this.parseTextIntoBlocks(item.question.text);
          }

          if ((item.type === QuestionType.FILL_BLANKS) && (item.question.isDragWords)) {
            item.question.hiddenWords?.forEach((word: HiddenWord) => {
              word.isDraggable = true;
            })
          }

          if (item.question.options) {
            item.question.options.forEach((option: Option) => {
              option.isSelected = false;
            });
          }

          item.question.isCorrect = false;

          item.question.isWithTiming = item.question.isWithTiming;
          if (item.question.isWithTiming) item.question.duration = item.question.duration;

          if (this.isMiniQuiz) {
            item.question.isValidate = false;
          }

          return item;
        });

        if (response.sessionId !== undefined) {
          this.examSession.sessionId = response.sessionId;
        }

        if (response.examSessionEndDate !== undefined) {
          const examSessionEndDate = new Date(response.examSessionEndDate);
          this.examSession.examSessionEndDate = examSessionEndDate;
          if (examSessionEndDate <= new Date()) {
            this.validateAndProceed();
          }

          this.subscription.push(this.timer.subscribe(() => {
            this.checkExamSessionEndDate();
          }));
        }

        if (this.questionsList[this.currentQuestionNo].question.isWithTiming) {
          //this.remainingTime = 10;
          this.remainingTime = this.questionsList[this.currentQuestionNo].question.duration;
          if (!this.isMiniQuiz) {
            this.subscription.push(this.timer.subscribe(res => {
              if ((this.remainingTime != 0) && (!this.isContinueExam)) {
                this.remainingTime--;
              }
              if (this.remainingTime == 0) {
                if (this.currentQuestionNo == this.questionsList.length - 1)
                  this.validateAndProceed();//finish final exam
                else this.nextQuestion();
              }
            })
            )
          }
        }

        console.log(this.questionsList);
      },
      (error) => {
        console.error('Error while fetching questions data:', error);
      }
    );
  }

  checkExamSessionEndDate() {
    const examSessionEndDate = this.examSession.examSessionEndDate;
    if (examSessionEndDate && examSessionEndDate <= new Date()) {
      this.validateAndProceed(); // Automatically finish the quiz
    }
  }

  getRepport(questionId: number): Observable<string[]> {
    return this.apiService.getAnswer(questionId).pipe(
      map((response: string[]) => {
        if (Array.isArray(response)) {
          return response;
        } else {
          return [];
        }
      }),
      catchError((error) => {
        console.error('Error while fetching answer data:', error);
        return of([]);
      })
    );
  }

  getTotalTestDurationInMinutes(): number {
    const questionsWithTiming = this.questionsList.filter((questionObj) => questionObj.question.isWithTiming);
    if (questionsWithTiming.length === 0) {
      return 0;
    }
    const totalDurationInSeconds = questionsWithTiming.reduce((acc, questionObj) => acc + questionObj.question.duration, 0);
    const totalDurationInMinutes = totalDurationInSeconds / 60;
    return totalDurationInMinutes;
  }
}