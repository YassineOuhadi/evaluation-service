import { Subscription, interval } from 'rxjs';
import {  ElementRef } from '@angular/core';
import { Observable } from 'rxjs';
import { Component, OnInit, ViewChild } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { trigger, state, style, transition, animate } from '@angular/animations';
import { ApiService } from '../../new-que.service';
import { ActivatedRoute } from '@angular/router';
import { map, catchError } from 'rxjs/operators';
import { of } from 'rxjs';
import { Router } from '@angular/router';

enum questionType {
  TRUE_FALSE = "TRUE_FALSE",
  CHOICE = "CHOICE",
  FILL_BLANKS = "FILL_BLANKS",
  MATCHING = "MATCHING"
}

interface subLanguage {
  id: number;
  name: string;
}

interface Option {
  id: number;
  text: string;
  isSelected: boolean;
}

interface Block {
  word: string;
  specialCharacter?: string;
  isSelected: boolean;
}

interface hiddenWords {
  word : string;
  isDraggable: boolean
}

interface questionObj {
  type: questionType;
  question: question; responses?: string[];
}

interface question {
  id: number;
  code: string;
  text: string;
  correctAnswerTipText: string;
  incorrectAnswerTipText: string;
  subLanguages: subLanguage[];

  options?: Option[];
  isMultipleChoice?: boolean,
  
  isDragWords?: boolean,
  hiddenWords?: hiddenWords[],
  textBlocks: Block[],

  isCorrect: boolean,
  isValidate?: boolean,

  isWithTiming: boolean;
  duration: number;
}

interface SelectedBlockInfo {
  questionId: number;
  blocks: { id: number; word: string }[];
}

@Component({
  selector: 'app-play-quiz',
  templateUrl: './play-quiz.component.html',
  styleUrls: ['./play-quiz.component.css'],
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

export class PlayQuizComponent implements OnInit{

  onClickTitle() {}
  currentLanguage = 'en';
  content: any;
  isMiniQuiz: boolean = false;
  showWarning: boolean = true;
  isQuizStarted: boolean = false;
  isQuizEnded: boolean = false;
  isQuizStoped: boolean = false;
  questionsList: questionObj[]= [];
  currentQuestionNo: number = 0;

  remainingTime:number = 0;

  timer = interval(1000);
  subscription: Subscription [] = [];
  correctAnswerCount: number = 0;
  
  currentDraggedWord: hiddenWords | null = null;
  currentDroppedWord: hiddenWords | null = null;


  exit(){
    this.router.navigateByUrl('/');
  }

  getLayoutDirection(): string {
    return this.currentLanguage === 'ar' ? 'rtl' : 'ltr';
  }

  rightToLeft(): boolean {
    return this.currentLanguage !== 'ar'; // Show outline for all languages except Arabic.
  }

  changeLanguage(language: string) {
    this.currentLanguage = language;
  } 

  getDropHereTranslation(): string {
    const dropHereTranslations = this.content.buttons.dropHere;
    const currentLanguage = this.currentLanguage || 'en';
    return dropHereTranslations[currentLanguage];
  }
  
  refreshContent() {
    this.currentDroppedWord = null;
    this.questionsList[this.currentQuestionNo].question.textBlocks.filter((o:any)=>o.isSelected == true).forEach((block) => (block.word = ''));
    this.questionsList[this.currentQuestionNo].question.hiddenWords?.forEach((hiddenWord: hiddenWords) => {
      hiddenWord.isDraggable =true;
    })
  }

  hasDraggableHiddenWords(): boolean {
    const question = this.questionsList[this.currentQuestionNo]?.question;
    return question?.hiddenWords?.some(word => word.isDraggable) || false;
  }
  
  onDragStart(event: DragEvent, dragWord: hiddenWords) {
    this.currentDraggedWord = dragWord;
    const draggedElement = event.target as HTMLElement;
    draggedElement.classList.add('dragged-word');
  }

  onClickStart(dragWord: hiddenWords) {
    this.currentDraggedWord = dragWord;
    console.log(dragWord);
  }

  onClickEnd() {
    
  }

  onDragOver(event: DragEvent) {
    event.preventDefault();
  }

  onDrop(event: DragEvent, block: Block) {
    event.preventDefault();
    if (this.currentDraggedWord) {
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

      if (this.questionsList[this.currentQuestionNo].type === questionType.FILL_BLANKS) {

        const selectedBlocks: { blockNumber: number; text: string }[] = [];
        let blockNumber = 1;

        for (const block of this.questionsList[this.currentQuestionNo].question.textBlocks) {
          if (block.isSelected) {
            selectedBlocks.push({ blockNumber: blockNumber++, text: block.word });
          }
        }

        const data: { questionId: number; blocks: { blockNumber: number; text: string }[] } = {
          questionId: this.questionsList[this.currentQuestionNo].question.id,
          blocks: selectedBlocks,
        };

        this.validateResponse(data).subscribe((isCorrect: boolean) => {
          
          if (this.questionsList[this.currentQuestionNo].question.isCorrect) {
            this.correctAnswerCount--;
            this.questionsList[this.currentQuestionNo].question.isCorrect = !this.questionsList[this.currentQuestionNo].question.isCorrect; // Reset isCorrect flag for the question
          } else if (isCorrect) {
            this.correctAnswerCount++;
            this.questionsList[this.currentQuestionNo].question.isCorrect = !this.questionsList[this.currentQuestionNo].question.isCorrect; // Set isCorrect flag for the question
          }
          console.log(this.correctAnswerCount);
        });
      }
    }
    if(this.isMiniQuiz) this.questionsList[this.currentQuestionNo].question.isValidate = false;
  }

  calculateInputWidth(block: Block): string {
    if (!block.word) {
      return '100px';
    }
    const wordLength = block.word.length;
    const averageCharacterWidth = 7.64;
    const minWidth = 20;
    const calculatedWidth = Math.max(wordLength * averageCharacterWidth, minWidth);
    return `${calculatedWidth}px`;
  }

  constructor(
    private http: HttpClient, 
    private elementRef: ElementRef,
    private apiService: ApiService,
    private route: ActivatedRoute,
    private router: Router)
  {
    this.http.get("assets/playConstants.json").subscribe((res:any)=>{
      debugger;
      this.content = res;
    })
  }

  ngOnInit(): void { 
    this.route.queryParams.subscribe(params => {
      this.isMiniQuiz = params['isMiniQuiz'] === 'true';
    });
    this.loadQuestions(); 
  }

  loadQuestions() {

    this.apiService.getQuestions(11).subscribe(
      (response) => {
        this.questionsList = response.map((item: questionObj) => {

          if (item.type === questionType.TRUE_FALSE) {
            item.question.options = [
              { id: 1, text: "True", isSelected: false },
              { id: 2, text: "False", isSelected: false },
            ];
          }

          if(item.type === questionType.FILL_BLANKS) {
            item.question.textBlocks = this.parseTextIntoBlocks(item.question.text);
          }

          if((item.type === questionType.FILL_BLANKS) && (item.question.isDragWords)) {
            item.question.hiddenWords?.forEach((word: hiddenWords) => {
              word.isDraggable =true;
            })
          }

          if (item.question.options) {
            item.question.options.forEach((option: Option) => {
              option.isSelected = false;
            });
          }

          item.question.isCorrect = false;

          item.question.isWithTiming = item.question.isWithTiming;
          if(item.question.isWithTiming) item.question.duration = item.question.duration;

          if(this.isMiniQuiz) {
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
          blocks.push({ word: trimmedWord, specialCharacter, isSelected: true});
        } 
        else if(specialCharacters.some(specialChar => word.endsWith(`**${specialChar}`))){
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
        if(specialCharacter){
          word = word.substring(0, word.length - 1);
        }
        blocks.push({ word, specialCharacter, isSelected: false });
      }
    }
    if (wordBuffer !== '') {
      blocks.push({ word: wordBuffer.trim(), isSelected });
    }
    return  blocks ;
  }

  onTextareaInput(queObj: questionObj) {
    if (this.questionsList[this.currentQuestionNo].type === questionType.FILL_BLANKS) {
      const selectedBlocks: { blockNumber: number; text: string }[] = [];
      let blockNumber = 1;
  
      for (const block of this.questionsList[this.currentQuestionNo].question.textBlocks) {
        if (block.isSelected) {
          selectedBlocks.push({ blockNumber: blockNumber++, text: block.word });
        }
      }
  
      const data: { questionId: number; blocks: { blockNumber: number; text: string }[] } = {
        questionId: queObj.question.id,
        blocks: selectedBlocks,
      };
  
      this.validateResponse(data).subscribe((isCorrect: boolean) => {
        console.log("fillbalks is true:",isCorrect);
        if (queObj.question.isCorrect && !isCorrect) {
          this.correctAnswerCount--;
          queObj.question.isCorrect = false;
        }  if (isCorrect && !queObj.question.isCorrect) {
          this.correctAnswerCount++;
          queObj.question.isCorrect = true;
        }
        console.log(this.correctAnswerCount);
      });
    }

    if(this.isMiniQuiz) this.questionsList[this.currentQuestionNo].question.isValidate = false;
  }
  
  validateAnswer() {
    if(this.isMiniQuiz)
    this.questionsList[this.currentQuestionNo].question.isValidate = true;
  }

  nextQuestion() {
    if(this.currentQuestionNo < this.questionsList.length-1) {
        //this.remainingTime = 10;
        this.currentQuestionNo ++;  
        if(this.questionsList[this.currentQuestionNo].question.isWithTiming) this.remainingTime = this.questionsList[this.currentQuestionNo].question.duration; 
    } else {
        this.subscription.forEach(element => {
        element.unsubscribe();
        this.finish();
       });
    } 
  }

  stop() {
    this.isQuizStarted = false;
    this.isQuizStoped = true;
    this.showWarningPopup();
  }
  
  finish() {
    if ((this.isMiniQuiz || this.remainingTime == 0)) {

      if(!this.isMiniQuiz) {
        this.questionsList.forEach((questionObj) => {
          const questionId = questionObj.question.id;
          this.getRepport(questionId).subscribe((responses) => {
            questionObj.responses = responses;
          });
        });
      }
      this.currentQuestionNo = 0;
      this.isQuizEnded = true;
      this.isQuizStarted = false; 
    }
    else {
      this.isQuizStarted = false;
      this.isQuizStoped = true;
      this.showWarningPopup();
    }
  }

  start() {
    this.currentQuestionNo=0;
    //this.remainingTime = 10;
    if(this.questionsList[this.currentQuestionNo].question.isWithTiming) this.remainingTime = this.questionsList[this.currentQuestionNo].question.duration;
    this.showWarning = false;
    this.isQuizEnded = false;
    this.isQuizStarted = false;  
  }

  showWarningPopup() { 
    this.showWarning = true;
  }

  selectOption(queObj: questionObj,option: any) {
    if(queObj.type === questionType.CHOICE && queObj.question.isMultipleChoice){

      option.isSelected = !option.isSelected;
      const optionsData: { id: number; isCorrect: boolean }[] = queObj.question.options?.map((opt) => ({
        id: opt.id,
        isCorrect: opt.isSelected,
      })) || [];

      const data: { questionId: number; options: { id: number; isCorrect: boolean }[] } = {
        questionId: queObj.question.id,
        options: optionsData,
      };

      this.validateResponse(data).subscribe((isCorrect: boolean) => {
        if(queObj.question.isCorrect) {
          this.correctAnswerCount --;
          queObj.question.isCorrect = !queObj.question.isCorrect;
        }
        else if(isCorrect) {
          this.correctAnswerCount ++;
          queObj.question.isCorrect = !queObj.question.isCorrect;
        }

        console.log(this.correctAnswerCount);
      });
      
    } else if ((queObj.type === questionType.CHOICE && !queObj.question.isMultipleChoice) || (queObj.type === questionType.TRUE_FALSE)) {
      if(!option.isSelected){

        if(queObj.type === questionType.TRUE_FALSE) {
          
          queObj.question.options?.filter((m:any)=>m.isSelected == true).forEach((o:any)=>o.isSelected = false);
          option.isSelected = !option.isSelected;
            
          const data: { questionId: number; isCorrect: boolean } = {
            questionId: queObj.question.id,
            isCorrect: option.text,
          };
         
                    
          this.validateResponse(data).subscribe((isCorrect: boolean) => {
            
            if(queObj.question.isCorrect) {
              this.correctAnswerCount --;
              queObj.question.isCorrect = !queObj.question.isCorrect;
            }
            else if(isCorrect) {
              this.correctAnswerCount ++;
              queObj.question.isCorrect = !queObj.question.isCorrect;
            }
            
            console.log(this.correctAnswerCount);
          });   
    
        }

        if(queObj.type === questionType.CHOICE && !queObj.question.isMultipleChoice) {

          queObj.question.options?.filter((m:any)=>m.isSelected == true).forEach((o:any)=>o.isSelected = false);
          option.isSelected = !option.isSelected;

          const optionsData: { id: number; isCorrect: boolean }[] = queObj.question.options?.map((opt) => ({
            id: opt.id,
            isCorrect: opt.isSelected,
          })) || [];

          const data: { questionId: number; options: { id: number; isCorrect: boolean }[] } = {
            questionId: queObj.question.id,
            options: optionsData,
          };

          this.validateResponse(data).subscribe((isCorrect: boolean) => {
            if(queObj.question.isCorrect) {
              this.correctAnswerCount --;
              queObj.question.isCorrect = !queObj.question.isCorrect;
            }
            else if(isCorrect) {
              this.correctAnswerCount ++;
              queObj.question.isCorrect = !queObj.question.isCorrect;
            }

            console.log(this.correctAnswerCount);
          }); 
        }
        
      }
    }

    
    if(this.isMiniQuiz) this.questionsList[this.currentQuestionNo].question.isValidate = false;
  }
  
  validateResponse(data: any): Observable<boolean> {
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

  areAllCorrectOptionsSelected(question: question, selectedOption: any): boolean {
    const selectedOptions = question.options?.filter((o: any) => o.isSelected) || [];
    const correctOptions = question.options?.filter((o: any) => o.correct) || [];
    const areAllOptionsSelected = selectedOptions.every((o: any) => o.correct);
    const areAllCorrectOptionsSelected = selectedOptions.length === correctOptions.length;
    return areAllOptionsSelected && areAllCorrectOptionsSelected;
  }
  
  isOptionSelected(options: any) {
    const selectionCount = options.filter((m:any)=>m.isSelected == true).length;
    if(selectionCount == 0) {
      return false;
    } else {
      return true;
    }
  }

  startQuiz() {
    this.isQuizEnded = false;
    this.showWarning = false;
    this.isQuizStarted = true;  



    if(this.questionsList[this.currentQuestionNo].question.isWithTiming) {
      //this.remainingTime = 10;
      this.remainingTime = this.questionsList[this.currentQuestionNo].question.duration;
      if(!this.isMiniQuiz){
        this.subscription.push(this.timer.subscribe(res=> {
          if((this.remainingTime != 0)&&(!this.isQuizStoped)) {
            this.remainingTime --;
          } 
          if(this.remainingTime == 0) {
            this.nextQuestion();
          }
        })
        )
      }
    }


  }

  ContinueQuiz() {
    this.isQuizEnded = false;
    this.showWarning = false;
    this.isQuizStarted = true;  
    this.isQuizStoped = false;    
  }

  ReplayQuiz() {
    //this.remainingTime = 10;
    this.currentQuestionNo = 0;
    if(this.questionsList[this.currentQuestionNo].question.isWithTiming) this.remainingTime = this.questionsList[this.currentQuestionNo].question.duration;
    this.startQuiz();
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
