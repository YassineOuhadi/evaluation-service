import { Component, OnInit, Inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { trigger, state, style, transition, animate } from '@angular/animations';
import { AppService } from '../../app.service';
import { Observable } from 'rxjs';
import { Subscription, interval } from 'rxjs';
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

export class ConfirmationDialogComponent implements OnInit {

  currentLanguage = 'en';
  content: any;

  deleteInAllCourses = true;
  selectedCourses: number[] = [];
  confirmedDeleteCourses = false;

  constructor(private http: HttpClient,
    @Inject(MAT_DIALOG_DATA) public data: { questions: QuestionObj[]; currentLanguage: string },
    public dialogRef: MatDialogRef<ConfirmationDialogComponent>) {
    this.http.get("assets/json/table.json").subscribe((res: any) => {
      this.content = res;
    });
  }

  ngOnInit(): void {
    this.currentLanguage = this.data.currentLanguage;
    console.log("dialog data", this.data);

    if (this.data.questions.length === 1) {
      this.initializeSelectedCourses();
      if (this.data.questions[0].courses.length === 0) this.confirmedDeleteCourses = true;
    }
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

  initializeSelectedCourses(): void {
    this.selectedCourses = this.data.questions[0].courses.map(course => course.id);
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

  closeDialog(): void {
    this.dialogRef.close();
  }
}
