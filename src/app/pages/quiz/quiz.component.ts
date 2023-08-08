import { HttpClient } from '@angular/common/http';
import { Component, OnInit } from '@angular/core';
import { Subscription, interval } from 'rxjs';
@Component({
  selector: 'quiz-app',
  templateUrl: './quiz.component.html',
  styleUrls: ['./quiz.component.css']
})
export class QuizAppComponent implements OnInit {

  showWarning: boolean = false;

  isQuizStarted: boolean = false;
  isQuizEnded: boolean = false;
  isQuizStoped: boolean = false;
  questionsList: any[]= [];
  currentQuestionNo: number = 0;

  remainingTime:number = 10;

  timer = interval(1000);
  subscription: Subscription [] = [];
  correctAnswerCount: number = 0;

  departments: any[]=[];
 
  deptObj: any = {
    DeptId: 0,
    DepartmentName: ''
  }
  constructor(private http: HttpClient) { }

  ngOnInit(): void { 
    this.loadQuestions();
  }
  loadQuestions() {
    this.http.get("assets/questions.json").subscribe((res:any)=>{
      debugger;
      this.questionsList = res;
    })
  }
  nextQuestion() {
    if(this.currentQuestionNo < this.questionsList.length-1) {
        this.remainingTime = 10;
        this.currentQuestionNo ++;   
    } else {
        this.subscription.forEach(element => {
        element.unsubscribe();
        this.finish();
       });
    } 
  }
  finish() {
    if(this.remainingTime == 0){
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
    this.remainingTime =10;
    this.showWarning = false;
    this.isQuizEnded = false;
    this.isQuizStarted = false;  
  }

  showWarningPopup() { 
    this.showWarning = true;
  }

  selectOption(option: any) {
    if(option.isCorrect) {
      this.correctAnswerCount ++;
    }
    option.isSelected = true;
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
    this.subscription.push(this.timer.subscribe(res=> {
      console.log(res);
      if((this.remainingTime != 0)&&(!this.isQuizStoped)) {
        this.remainingTime --;
      } 
      if(this.remainingTime == 0) {
        this.nextQuestion();
      }
    })
    )
  }

  ContinueQuiz() {
    this.isQuizEnded = false;
    this.showWarning = false;
    this.isQuizStarted = true;  
    this.isQuizStoped = false;    
  }

  ReplayQuiz() {
    this.remainingTime = 10;
    this.currentQuestionNo = 0;
    this.startQuiz();
  }
}
