import { trigger, state, style, transition, animate } from '@angular/animations';
import { MatPaginator, PageEvent } from '@angular/material/paginator';
import { Component, OnInit, ViewChild } from '@angular/core';
import { MatTableDataSource } from '@angular/material/table';
import { LoadingBarService } from '@ngx-loading-bar/core';
import { MatSort, Sort } from '@angular/material/sort';
import { MatDialog } from '@angular/material/dialog';
import { HttpClient } from '@angular/common/http';
import { map, startWith } from 'rxjs/operators';
import { FormControl } from '@angular/forms';
import { Router } from '@angular/router';
import { Observable } from 'rxjs';
import { ConfirmationDialogComponent } from '../../components/confirmation-dialog/confirmation-dialog.component';
import { PlayModalComponent } from '../../components/play-modal/play-modal.component';
import { AppService } from '../../app.service';
import { MatPaginatorIntl } from '@angular/material/paginator';
import { SelectionModel } from '@angular/cdk/collections';
import { forkJoin } from 'rxjs';

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
  selector: 'app-questions-list',
  templateUrl: './questions.component.html',
  styleUrls: ['./questions.component.css'],
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

export class QuestionsComponent implements OnInit {

  loadingDuration = 2000;
  isLoading = false;

  content: any;
  currentLanguage = 'en';

  questionsList: QuestionObj[] = [];
  displayedColumns: string[] = ['select', 'code', 'type', 'text', 'courses', 'play', 'edit', 'delete'];
  dataSource!: MatTableDataSource<QuestionObj>;
  languages: Language[] = [];
  courses: Course[] = [];
  isTypeAutocompleteOpen = false;
  isLanguageAutocompleteOpen = false;
  isCourseAutocompleteOpen = false;
  languageControl = new FormControl();
  filteredLanguages!: Observable<Language[]>;
  courseControl = new FormControl();
  filteredCourses!: Observable<Course[]>;
  typeControl = new FormControl();
  questionTypes = Object.values(QuestionType);
  pageSize = 10;
  pageIndex = 0;
  totalItems = 0;
  questionCodeFilter: string = '';
  selection = new SelectionModel<QuestionObj>(true, []);
  @ViewChild(MatPaginator) paginator!: MatPaginator;
  @ViewChild(MatSort) sort!: MatSort;

  constructor(
    private loadingBarService: LoadingBarService,
    private router: Router,
    public _MatPaginatorIntl: MatPaginatorIntl,
    private http: HttpClient,
    private apiService: AppService,
    private dialog: MatDialog) {
    this.http.get("assets/questionsList.json").subscribe((res: any) => {
      //debugger;
      this.content = res;
    });
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

  ngAfterViewInit(): void {
    this.loadQuestions();
    this._MatPaginatorIntl.itemsPerPageLabel = this.content.table.itemsPerPageLabel[this.currentLanguage];
    this._MatPaginatorIntl.nextPageLabel = this.content.table.nextPageLabel[this.currentLanguage];
    this._MatPaginatorIntl.previousPageLabel = this.content.table.previousPageLabel[this.currentLanguage];
  }

  ngOnInit(): void {
    //this.loadQuestions();
    this.apiService.getLang().subscribe(
      (languages) => {
        this.languages = languages;
        this.filteredLanguages = this.languageControl.valueChanges.pipe(
          startWith(''),
          map((value) => this._filterLanguages(value?.toString().toLowerCase() ?? ''))
        );
      },
      (error) => {
        console.error('Error while fetching languages:', error);
      }
    );
    this.apiService.getCourses().subscribe(
      (courses) => {
        this.courses = courses;
        this.filteredCourses = this.courseControl.valueChanges.pipe(
          startWith(''),
          map((value) => this._filterCourses(value?.toString().toLowerCase() ?? ''))
        );
      },
      (error) => {
        console.error('Error while fetching courses:', error);
      }
    );
  }

  private _filterLanguages(value: string): Language[] {
    return this.languages.filter((language) =>
      language.name.toLowerCase().includes(value?.toString().toLowerCase() ?? '')
    );
  }

  displayLanguageName(language: Language): string {
    return language && language.name ? language.name : '';
  }

  private _filterCourses(value: string): Course[] {
    return this.courses.filter((course) =>
      course.name.toLowerCase().includes(value?.toString().toLowerCase() ?? '')
    );
  }

  displayCourseName(course: Course): string {
    return course && course.name ? course.name : '';
  }

  loadQuestions() {
    this.loadingBarService.start();
    this.isLoading = true;
    const sortAttribute = this.sort.active || 'id';
    const sortDirection = this.sort.direction || 'asc';
    const languageId = this.languageControl.value ? this.languageControl.value.id : undefined;
    const courseId = this.courseControl.value ? this.courseControl.value.id : undefined;
    const type = this.typeControl.value ? this.typeControl.value : undefined;
    this.apiService.getAllQuestions(
      this.pageIndex,
      this.pageSize,
      this.questionCodeFilter,
      languageId,
      courseId,
      type,
      sortAttribute,
      sortDirection
    ).subscribe(
      (response: any) => {
        this.questionsList = response.content.map((item: any) => {

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
            item.question.HiddenWord?.forEach((word: HiddenWord) => {
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

          item.question.isValidate = false;
          item.question.courses = item.question.courses || []; // Ensure 'courses' property is initialized

          return item;
        });

        this.dataSource = new MatTableDataSource(this.questionsList);
        this.totalItems = response.totalElements;
        this.dataSource.sort = this.sort;
        this.loadingBarService.complete();
        this.isLoading = false;
      },
      (error) => {
        console.error('Error while fetching questions data:', error);
        this.loadingBarService.complete();
        this.isLoading = false;
      }
    );
  }

  onPageChange(event: PageEvent) {
    this.pageIndex = event.pageIndex;
    this.pageSize = event.pageSize;
    this.loadQuestions();
  }

  onSortChange(event: Sort) {
    console.log('Sorting attribute:', event.active);
    console.log('Sorting direction:', event.direction);
    this.loadQuestions();
  }

  playQuestion(event: Event, queObj: QuestionObj) {
    event.stopPropagation();
    const dialogRef = this.dialog.open(PlayModalComponent, {
      width: '600px',
      //data: queObj,
      data: {
        questionObj: queObj, // Pass your question object here
        currentLanguage: this.currentLanguage, // Pass the current language value
      },
    });
    dialogRef.afterClosed().subscribe(result => {
      queObj.question.isCorrect = false;
      queObj.question.isValidate = false;
      if ((queObj.type === QuestionType.CHOICE || queObj.type === QuestionType.TRUE_FALSE) && queObj.question.options)
        queObj.question.options.forEach((option) => (option.isSelected = false));

    });
  }

  createQuestion() {
    this.loadingBarService.start();
    this.isLoading = true
    this.router.navigate(['/create'], { queryParams: { lang: this.currentLanguage } }).then(() => {
      this.loadingBarService.complete();
      this.isLoading = false;
    });
  }

  editQuestion(event: Event, question: QuestionObj) {
    event.stopPropagation();
    this.loadingBarService.start();
    this.isLoading = true
    this.router.navigate(['/create'], { queryParams: { questionId: question.question.id, lang: this.currentLanguage } }).then(() => {
      this.loadingBarService.complete();
      this.isLoading = false;
    });
  }

  deleteSingleQuestion(question: QuestionObj): Observable<void> {
    return new Observable<void>((observer) => {
      this.apiService.deleteQuestion(question.question.id).subscribe(
        (response) => {
          console.log(response.message);
          this.questionsList = this.questionsList.filter(q => q !== question);
          this.dataSource.data = this.questionsList;

          observer.next();
          observer.complete();
        },
        (error) => {
          console.error('Error deleting question:', error);
          observer.error(error);
        }
      );
    });
  }

  deleteQuestion(event: Event, ...questions: QuestionObj[]) {
    event.stopPropagation();
    const dialogRef = this.dialog.open(ConfirmationDialogComponent, {
      width: '400px',
      data: {
        questions,
        currentLanguage: this.currentLanguage,
      },
      //data: question,
    });
    dialogRef.afterClosed().subscribe(result => {
      if (result && result.confirmed) {

        if (result.deleteQuestion) {

          this.loadingBarService.start();
          this.isLoading = true;

          const deleteObservables: Observable<void>[] = questions.map(question =>
            this.deleteSingleQuestion(question)
          );

          forkJoin(deleteObservables).subscribe(
            () => {
              this.loadingBarService.complete();
              this.isLoading = false;
            },
            (error) => {
              console.error('Error deleting questions:', error);
              this.loadingBarService.complete();
              this.isLoading = false;
            }
          );
        }

        else if (result.deleteCourses && result.deleteCourses.length > 0) {
          const courseIdArray: number[] = result.deleteCourses || [];
          courseIdArray.forEach(courseId => {
            const deleteData: { courseId: number, questionId: number } = {
              courseId: courseId,
              questionId: questions[0].question.id
            };
            this.loadingBarService.start();
            this.isLoading = true;
            this.apiService.deleteQuestionFromCourse(deleteData).subscribe(
              () => {
                questions[0].question.courses = questions[0].question.courses.filter(course =>
                  !result.deleteCourses.includes(course.id)
                );

                const loadingTimer = setTimeout(() => {
                  this.loadingBarService.complete();
                  this.isLoading = false;
                  clearTimeout(loadingTimer);
                }, this.loadingDuration);
              },
              (error) => {
                console.error('Error deleting question:', error);
                const loadingTimer = setTimeout(() => {
                  this.loadingBarService.complete();
                  this.isLoading = false;
                  clearTimeout(loadingTimer);
                }, this.loadingDuration);
              }
            );
          });
        }


      }
    });
  }

  resetFilters() {
    this.questionCodeFilter = '';
    this.languageControl.setValue('');
    this.typeControl.setValue('');
    this.courseControl.setValue('');
    this.applyFilter();
  }

  applyFilter() {
    this.loadQuestions();
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

  isMultiSelectEnabled(): boolean {
    return !this.hasQuestionsWithCourses();
  }

  hasQuestionsWithCourses(): boolean {
    return this.questionsList.some(question => question.question.courses.length > 0);
  }

  deleteSelectedQuestions(event: Event) {
    const selectedQuestions: QuestionObj[] = this.selection.selected;
    if (selectedQuestions.length === 1) {
      this.deleteQuestion(event, selectedQuestions[0]);
    } else {
      this.deleteQuestion(event, ...selectedQuestions);
    }
    this.selection.clear();
  }

  isAllSelected() {
    const numSelected = this.selection.selected.length;
    const numRows = this.dataSource.data.length;
    return numSelected === numRows;
  }

  masterToggle() {
    this.isAllSelected() ?
      this.selection.clear() :
      this.dataSource.data.forEach(row => this.selection.select(row));
  }

  isQuestionWithCoursesSelected(): boolean {
    return this.selection.selected.some(row => row.question.courses.length > 0);
  }

  isRowDisabled(row: QuestionObj) {
    return !this.selection.isSelected(row) && (this.isQuestionWithCoursesSelected() || (this.selection.hasValue() && row.question.courses.length > 0));
  }
}