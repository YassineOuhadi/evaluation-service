import { Component, OnInit, Inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { trigger, state, style, transition, animate } from '@angular/animations';
import { ApiService } from '../../new-que.service';
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
  selector: 'app-confirmation-dialog',
  templateUrl: './confirmation-dialog.component.html',
  styleUrls: ['./confirmation-dialog.component.css'],
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
export class ConfirmationDialogComponent implements OnInit{

  currentLanguage = 'en';
  content: any;

  deleteInAllCourses = true;
    selectedCourses: number[] = [];
  confirmedDeleteCourses = false; // New property to track whether courses deletion is confirmed

  constructor(private http: HttpClient, 
    @Inject(MAT_DIALOG_DATA) public data: { question: QuestionObj["question"]; currentLanguage: string } ,
    public dialogRef: MatDialogRef<ConfirmationDialogComponent> ) {
    this.http.get("assets/questionsList.json").subscribe((res: any) => {
      this.content = res;
    });
  }

  ngOnInit(): void {
this.currentLanguage = this.data.currentLanguage;
    console.log('Question Data:', this.data);
        this.initializeSelectedCourses();
        if(this.data.question.courses.length === 0) this.confirmedDeleteCourses = true;
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

  initializeSelectedCourses(): void {
    this.selectedCourses = this.data.question.courses.map(course => course.id);
  }

  closeDialog(): void {
    this.dialogRef.close();
  }

  toggleCourse(courseId: number): void {
    if (this.selectedCourses.includes(courseId)) {
      this.selectedCourses = this.selectedCourses.filter(selectedCourse => selectedCourse !== courseId);
    } else {
      this.selectedCourses.push(courseId);
    }
  }

  confirmCoursesDeletion(): void {
    this.confirmedDeleteCourses = true;
  }
}
