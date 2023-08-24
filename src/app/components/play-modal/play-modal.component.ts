import { Component, OnInit, Inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { trigger, state, style, transition, animate } from '@angular/animations';
import { AppService } from '../../app.service';
import { Observable } from 'rxjs';
import { Subscription, interval } from 'rxjs';
import { QuestionType, 
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
  selector: 'app-play-modal',
  templateUrl: './play-modal.component.html',
  styleUrls: ['./play-modal.component.css'],
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

export class PlayModalComponent implements OnInit {

  currentLanguage = 'ar';
    subscription: Subscription [] = [];

  timer = interval(1000);
  content: any;
  remainingTime: number = 0;
currentDraggedWord: HiddenWord | null = null;
  currentDroppedWord: HiddenWord | null = null;

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
  

  constructor(private http: HttpClient, @Inject(MAT_DIALOG_DATA) 
    public data: { questionObj: QuestionObj; currentLanguage: string }, private apiService: AppService,public dialogRef: MatDialogRef<PlayModalComponent> ) {
    this.http.get("assets/playConstants.json").subscribe((res: any) => {
      this.content = res;
    });
  }

  ngOnInit(): void { 
   
this.currentLanguage = this.data.currentLanguage;

    this.data.questionObj.question.hiddenWords?.forEach((word: HiddenWord) => {
              word.isDraggable =true;
    })

 console.log('Question Data:', this.data);

    if(this.data.questionObj.question.isWithTiming) {
      this.remainingTime = this.data.questionObj.question.duration;
      this.subscription.push(this.timer.subscribe(res=> {
          if(this.remainingTime != 0) {
            this.remainingTime --;
          } 
          if(this.remainingTime == 0) {
            this.dialogRef.close();
          }
        })
        )
    }
  }

  selectOption(queObj: QuestionObj,option: any) {
    if(queObj.type === QuestionType.CHOICE && queObj.question.isMultipleChoice){

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
          queObj.question.isCorrect = !queObj.question.isCorrect;
        }
        else if(isCorrect) {
          queObj.question.isCorrect = !queObj.question.isCorrect;
        }

      });
      
      
    } else if ((queObj.type === QuestionType.CHOICE && !queObj.question.isMultipleChoice) || (queObj.type === QuestionType.TRUE_FALSE)) {
      if(!option.isSelected){

        if(queObj.type === QuestionType.TRUE_FALSE) {
          
          queObj.question.options?.filter((m:any)=>m.isSelected == true).forEach((o:any)=>o.isSelected = false);
          option.isSelected = !option.isSelected;
            
          const data: { questionId: number; isCorrect: boolean } = {
            questionId: queObj.question.id,
            isCorrect: option.text.toLowerCase() === 'true'
          };
         
                
          this.validateResponse(data).subscribe((isCorrect: boolean) => {
            
            if(queObj.question.isCorrect) {
              queObj.question.isCorrect = !queObj.question.isCorrect;
            }
            else if(isCorrect) {
              queObj.question.isCorrect = !queObj.question.isCorrect;
            }
            
          });
          
    
        }

        if(queObj.type === QuestionType.CHOICE && !queObj.question.isMultipleChoice) {

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
              queObj.question.isCorrect = !queObj.question.isCorrect;
            }
            else if(isCorrect) {
              queObj.question.isCorrect = !queObj.question.isCorrect;
            }

          });
          
        }
        
      }
    }

    
    queObj.question.isValidate = false;
  }

  onTextareaInput(queObj: QuestionObj) {
    if (this.data.questionObj.type === QuestionType.FILL_BLANKS) {
      const selectedBlocks: { blockNumber: number; text: string }[] = [];
      let blockNumber = 1;
  
      for (const block of this.data.questionObj.question.textBlocks) {
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
          queObj.question.isCorrect = false;
        }  if (isCorrect && !queObj.question.isCorrect) {
          queObj.question.isCorrect = true;
        }
      });
    }

    this.data.questionObj.question.isValidate = false;
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

  hasDraggableHiddenWords(): boolean {
    const question = this.data?.questionObj?.question;
    return question?.hiddenWords?.some(word => word.isDraggable) || false;
  }

  onDragStart(event: DragEvent, dragWord: HiddenWord) {
    this.currentDraggedWord = dragWord;
    const draggedElement = event.target as HTMLElement;
    draggedElement.classList.add('dragged-word');
  }

  onClickStart(dragWord: HiddenWord) {
    this.currentDraggedWord = dragWord;
    console.log(dragWord);
  }

  onDragOver(event: DragEvent) {
    event.preventDefault();
  }

  onClickEnd() {
    
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

      if (this.data.questionObj.type === QuestionType.FILL_BLANKS) {

        const selectedBlocks: { blockNumber: number; text: string }[] = [];
        let blockNumber = 1;

        for (const block of this.data.questionObj.question.textBlocks) {
          if (block.isSelected) {
            selectedBlocks.push({ blockNumber: blockNumber++, text: block.word });
          }
        }

        const data: { questionId: number; blocks: { blockNumber: number; text: string }[] } = {
          questionId: this.data.questionObj.question.id,
          blocks: selectedBlocks,
        };

        this.validateResponse(data).subscribe((isCorrect: boolean) => {
          
          if (this.data.questionObj.question.isCorrect) {
            this.data.questionObj.question.isCorrect = !this.data.questionObj.question.isCorrect; // Reset isCorrect flag for the question
          } else if (isCorrect) {
            this.data.questionObj.question.isCorrect = !this.data.questionObj.question.isCorrect; // Set isCorrect flag for the question
          }
        });
      }
    }
    this.data.questionObj.question.isValidate = false;
  }

  refreshContent() {
    this.currentDroppedWord = null;
    this.data.questionObj.question.textBlocks.filter((o:any)=>o.isSelected == true).forEach((block) => (block.word = ''));
    this.data.questionObj.question.hiddenWords?.forEach((hiddenWord: HiddenWord) => {
      hiddenWord.isDraggable =true;
    });
    if (this.data.questionObj.question.isCorrect) {
            this.data.questionObj.question.isCorrect = !this.data.questionObj.question.isCorrect; // Reset isCorrect flag for the question
            this.data.questionObj.question.isValidate = false;
    }
  }

  validateAnswer() {
    this.data.questionObj.question.isValidate = true;
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
}
