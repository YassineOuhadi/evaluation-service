import { Component, OnInit, ViewChild } from '@angular/core';
import { LoadingBarService } from '@ngx-loading-bar/core';
import { MatSnackBar } from '@angular/material/snack-bar';
import { HttpClient } from '@angular/common/http';
import { AppService } from '../../app.service';
import { FormControl } from '@angular/forms';
import { Observable } from 'rxjs';
import { map, startWith } from 'rxjs/operators';
import { trigger, state, style, transition, animate } from '@angular/animations';
import { MatTabChangeEvent } from '@angular/material/tabs';
import { Router } from '@angular/router';
import { ActivatedRoute } from '@angular/router';

import {
  CreateQuestionData,
  Text,
  QuestionType,
  Block,
  Course,
  Language,
} from '../../interfaces';

@Component({
  selector: 'app-question-new',
  templateUrl: './create.component.html',
  styleUrls: ['./create.component.css'],
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
    ])
  ]
})

export class CreateComponent implements OnInit {

  /* Init */
  currentLanguage = 'en';
  content: any;

  isEditQuestion = false;
  isValidateQuestion = false;

  loadingDuration = 2000;
  panelOpenState = false;
  isLoading = false;
  isSaving = false;
  activeTabIndex = 0;
  isQteOpen = false;
  activeQuestionType: QuestionType | null = null;
  sectionStates: { [key: string]: boolean | string[] } = {};

  questions: CreateQuestionData[] = [];
  questionTextContents: { [key: string]: string } = {};
  questionTextObj: { [key: string]: Text } = {};
  words: string[] = [];

  languages: Language[] = [];
  courses: Course[] = [];
  selectedCourses: number[] = [];
  filteredLanguages!: Observable<Language[]>;
  languageControl = new FormControl();

  currentStepIndex = 0; // Initialize with the index of the first step
  questionIndex = false;

  // Function to handle step changes
  onStepChanged(index: number) {
    this.currentStepIndex = index;
    console.log('Current Step Index:', this.currentStepIndex);
  }

  constructor(
    private loadingBarService: LoadingBarService,
    private snackBar: MatSnackBar,
    private httpClient: HttpClient,
    private apiService: AppService, private http: HttpClient,
    private router: Router,
    private route: ActivatedRoute
  ) {

    this.http.get("assets/json/create.json").subscribe((res: any) => {
      //debugger;
      this.content = res;
    })

  }

  ngOnInit() {
    this.route.queryParams.subscribe(params => {
      const questionId = params['questionId'];
      if (params['lang']) this.currentLanguage = params['lang'];
      if (questionId) {
        this.handleEditQuestion(questionId);
      } else {
        this.handleCreateQuestion();
      }
    });
  }

  private handleCreateQuestion() {

    this.questions = [
      {
        type: QuestionType.CHOICE,
        code: '',
        text: '',
        correctAnswerTip: '',
        incorrectAnswerTip: '',
        isMultipleChoice: false,
        options: [
          { id: 1, text: '', isCorrect: false }
        ],
        coursesIds: [],
        languageId: 1,
      },
      {
        type: QuestionType.TRUE_FALSE,
        code: '',
        text: '',
        correctAnswerTip: '',
        incorrectAnswerTip: '',
        isCorrect: false,
        coursesIds: [],
        languageId: 1,
      },
      {
        type: QuestionType.FILL_BLANKS,
        code: '',
        text: '',
        correctAnswerTip: '',
        incorrectAnswerTip: '',
        isDragWords: false,
        coursesIds: [],
        languageId: 1,
      },
      {
        type: QuestionType.MATCHING,
        code: '',
        text: '',
        correctAnswerTip: '',
        incorrectAnswerTip: '',
        isDragWords: true,
        coursesIds: [],
        languageId: 1,
      }
    ];

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
      },
      (error) => {
        console.error('Error while fetching courses:', error);
      }
    );

  }

  initializeFields(question: CreateQuestionData) {
    if (this.isEditQuestion) {
      question.id ? this.handleEditQuestion(question.id) : null;
    } else {
      question.code = '';
      question.text = '';
      question.correctAnswerTip = '';
      question.incorrectAnswerTip = '';
      switch (this.activeQuestionType) {
        case QuestionType.CHOICE:
          question.options = [
            { id: 1, text: '', isCorrect: false }
          ];
          question.isMultipleChoice = false;
          break;
        case QuestionType.TRUE_FALSE:
          question.isCorrect = false;
          break;
        case QuestionType.FILL_BLANKS:
          question.isDragWords = false;
          break;
        default:
          break;
      }
    }
  }

  private handleEditQuestion(questionId: number) {
    this.isEditQuestion = true;

    this.apiService.findQuestion(questionId).subscribe(
      (response) => {
        console.log('Question:', response);
      },
      (e) => {
        console.error('Error while sending data:', e.error.message);
      }
    );

    this.apiService.findQuestion(questionId).subscribe(
      (response: any) => {
        console.log("Edit question", response);
        const questionData = response;
        let questionType = response.type as QuestionType;
        var mappedQuestion: CreateQuestionData;

        mappedQuestion = {
          id: questionData.id,
          type: questionType,
          code: questionData.code,
          text: questionData.text,
          correctAnswerTip: questionData.correctAnswerTip,
          incorrectAnswerTip: questionData.incorrectAnswerTip,
          coursesIds: questionData.courses.map((course: Course) => course.id),
          languageId: questionData.language.id,
        };

        if (questionType === QuestionType.CHOICE) {
          mappedQuestion.isMultipleChoice = questionData.isMultipleChoice;

          mappedQuestion.options = questionData.options.map((option: any) => {
            const optionText = option.text.replace(/^\d+\-\s*/, '');
            return {
              id: option.id,
              text: optionText,
              isCorrect: option.isCorrect
            };
          });

        }

        else if (questionType === QuestionType.TRUE_FALSE) {
          mappedQuestion.isCorrect = questionData.correct;
        }

        else if (questionType === QuestionType.FILL_BLANKS) {
          mappedQuestion.isDragWords = questionData.dragWords;
        }

        console.log("mapped question", mappedQuestion);

        this.questions = [mappedQuestion];

        this.isQteOpen = true;
        this.activeQuestionType = questionType;

        if (questionType === QuestionType.FILL_BLANKS) {
          //ontextaria fct
          this.questionTextContents[questionType] = questionData.text;
          this.questionTextObj[questionType] = this.parseTextIntoBlocks(questionData.text);
          this.updateWordPreview();
        }

        this.selectedCourses = questionData.courses.map((course: Course) => course.id);


      },
      (e) => {
        console.error('Error while sending data:', e.error.message);
      }
    );

    this.apiService.getCourses().subscribe(
      (courses) => {
        this.courses = courses;
      },
      (error) => {
        console.error('Error while fetching courses:', error);
      }
    );
  }

  isLanguageValid(): boolean {
    const selectedLanguage = this.languageControl.value;
    return !!selectedLanguage && this.languages.some(language => language.id === selectedLanguage.id);
  }

  private _filterLanguages(value: string): Language[] {
    return this.languages.filter((language) =>
      language.name.toLowerCase().includes(value?.toString().toLowerCase() ?? '')
    );
  }

  displayLanguageName(language: Language): string {
    return language && language.name ? language.name : '';
  }

  getQueType(question: CreateQuestionData): any {
    let queInfo: any;
    switch (question.type) {
      case QuestionType.CHOICE:
        if (question.isMultipleChoice) {
          queInfo = {
            name: this.content.questions.singleMultipleChoice.name[this.currentLanguage],
            description: this.content.questions.singleMultipleChoice.description[this.currentLanguage],
            image: 'multiple choice.png',
          };
        } else {
          queInfo = {
            name: this.content.questions.singleMultipleChoice.name[this.currentLanguage],
            description: this.content.questions.singleMultipleChoice.description[this.currentLanguage],
            image: 'single choice set.png',
          };
        }
        break;
      case QuestionType.TRUE_FALSE:
        queInfo = {
          name: this.content.questions.trueFalseQuestion.name[this.currentLanguage],
          description: this.content.questions.trueFalseQuestion.description[this.currentLanguage],
          image: 'true false.png',
        };
        break;
      case QuestionType.FILL_BLANKS:
        if (question.isDragWords) {
          queInfo = {
            name: this.content.questions.dragAndFill.name[this.currentLanguage],
            description: this.content.questions.dragAndFill.description[this.currentLanguage],
            image: 'drag the words.png',
          };
        } else {
          queInfo = {
            name: this.content.questions.dragAndFill.name[this.currentLanguage],
            description: this.content.questions.dragAndFill.description[this.currentLanguage],
            image: 'fill in the blanks.png',
          };
        }
        break;
      case QuestionType.MATCHING:
        queInfo = {
          name: this.content.questions.matchingItems.name[this.currentLanguage],
          description: this.content.questions.matchingItems.description[this.currentLanguage],
          image: 'matching.png'
        };
        break;
      default:
        queInfo = {
          name: '',
          description: '',
          image: '',
        };
        break;
    }
    return queInfo;
  }
  /* Init */

  /* Display */
  exit() {
    this.router.navigateByUrl('/questions');
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

  onTabChanged(event: MatTabChangeEvent): void {
    if (this.activeTabIndex === 1) {
      //console.log('Selected Sublanguages:', this.selectedSubLangIds);
    }
    this.activeTabIndex = event.index;
  }

  showToast(messageKey: string, languageCode: string): void {
    let message = this.content.messages[messageKey][languageCode];
    this.snackBar.open(message, this.content.close[languageCode], {
      duration: this.loadingDuration,
      horizontalPosition: 'center',
      verticalPosition: 'bottom',
    });
  }


  toggleQuestion(questionType: QuestionType): void {
    if (this.isEditQuestion) return;
    if (this.activeQuestionType === null || this.activeQuestionType !== questionType) {
      // toastr id activeQuestionType not null && !isQuestionEtatInitial
      let activeQuestion = this.questions.find((q) => q.type === this.activeQuestionType);
      activeQuestion ? this.initializeFields(activeQuestion) : null;
    }
    if (this.activeQuestionType === questionType) {
      if (this.questionIndex) this.isQteOpen = false;
      else this.isQteOpen = true
    }
    else {
      this.isQteOpen = true;
      this.activeQuestionType = questionType;
      if (this.activeQuestionType === QuestionType.FILL_BLANKS) {
        this.questionTextContents[this.activeQuestionType] = '';
      }
    }
    this.questionIndex = !this.questionIndex;
  }


  toggleMedia(questionType: QuestionType): void {
    this.sectionStates[`media_${questionType}`] = !this.sectionStates[`media_${questionType}`];
  }

  validateQuestion(questionType: QuestionType): void {
    this.sectionStates[`validate_${questionType}`] = true;
  }

  isQuestionValidate(questionType: QuestionType): boolean {
    const state = this.sectionStates[`validate_${questionType}`];
    return Array.isArray(state) ? state.length > 0 : state;
  }

  toggleOption(questionType: QuestionType, optionId: number): void {
    this.sectionStates[`option_${questionType}_${optionId}`] = !this.sectionStates[`option_${questionType}_${optionId}`];
  }

  toggleBlock(questionType: QuestionType): void {
    this.sectionStates[`block${questionType}`] = !this.sectionStates[`block${questionType}`];
  }

  toggleTips(questionType: QuestionType): void {
    this.sectionStates[`tips_${questionType}}`] = !this.sectionStates[`tips_${questionType}}`];
  }

  toggleSettings(questionType: QuestionType): void {
    this.sectionStates[`${questionType}_settings`] = !this.sectionStates[`${questionType}_settings`];
  }

  isMediaOpen(questionType: QuestionType): boolean {
    const state = this.sectionStates[`media_${questionType}`];
    return Array.isArray(state) ? state.length > 0 : state;
  }

  isOptionOpen(questionType: QuestionType, optionId: number): boolean {
    const state = this.sectionStates[`option_${questionType}_${optionId}`];
    return Array.isArray(state) ? state.length > 0 : state;
  }

  isBlockOpen(questionType: QuestionType): boolean {
    const state = this.sectionStates[`block${questionType}`];
    return Array.isArray(state) ? state.length > 0 : state;
  }

  isTipsOpen(questionType: QuestionType): boolean {
    const state = this.sectionStates[`tips_${questionType}}`];
    return Array.isArray(state) ? state.length > 0 : state;
  }

  isSettingsOpen(questionType: QuestionType): boolean {
    const state = this.sectionStates[`${questionType}_settings`];
    return Array.isArray(state) ? state.length > 0 : state;
  }

  addOption(question: any): void {
    const maxId = question.options.reduce((max: number, alt: any) => (alt.id > max ? alt.id : max), 0);
    question.options.push({ id: maxId + 1, text: '', isCorrect: false });
  }

  removeOption(questionType: QuestionType, optionId: number): void {
    const questionData = this.questions.find((q) => q.type === questionType);
    if (questionData && questionData.options) {
      questionData.options = questionData.options.filter((option) => option.id !== optionId);
    }
  }
  /* Display */

  /* Fill Blacks & Drag Words */
  parseTextIntoBlocks(text: string): Text {
    const blocks: Block[] = [];
    const words = text.split(/\s+/);
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
    return { blocks };
  }

  parseBlocksIntoText(textObj: Text): string {
    const textBlocks = textObj.blocks.map(block => {
      let wordWithSpecialCharacter = block.word;
      if (block.specialCharacter) {
        wordWithSpecialCharacter += block.specialCharacter;
      }
      return block.isSelected ? `**${wordWithSpecialCharacter}**` : wordWithSpecialCharacter;
    });
    return textBlocks.join(' ');
  }

  onTextareaInput(questionType: QuestionType) {
    this.questionTextObj[questionType] = this.parseTextIntoBlocks(this.questionTextContents[questionType]);
    this.updateWordPreview();
    console.log(this.questionTextObj[questionType]);
  }

  isWordSelected(questionType: QuestionType, index: number): boolean {
    const selectedWordsKey = `selectedWords_${questionType}`;
    this.sectionStates[selectedWordsKey] = this.sectionStates[selectedWordsKey] || [];
    const selectedWords = this.sectionStates[selectedWordsKey] as string[];
    const words = this.questionTextContents[questionType]?.split(/\s+/) || []; // Split the text into words

    if (index >= 0 && index < words.length) {
      const word = words[index];
      return selectedWords.includes(index.toString()) || (word.startsWith('**') && word.endsWith('**'));
    }

    return selectedWords.includes(index.toString());
  }

  updateWordPreview(): void {
    if (this.activeQuestionType) {
      const questionData = this.questions.find((q) => q.type === this.activeQuestionType);
      if (!questionData) return;
      questionData.text = this.questionTextContents[this.activeQuestionType];
    }
  }

  togglePreview(questionType: QuestionType): void {
    const isTextAreaShownKey = `isTextAreaShown_${questionType}`;
    const showPreviewKey = `showPreview_${questionType}`;
    this.sectionStates[isTextAreaShownKey] = !this.sectionStates[isTextAreaShownKey];
    this.sectionStates[showPreviewKey] = !this.sectionStates[showPreviewKey];
    this.updateWordPreview();
  }

  isWordPreview(questionType: QuestionType): boolean {
    const showPreviewKey = `showPreview_${questionType}`;
    return this.sectionStates[showPreviewKey] as boolean || false;
  }

  toggleWordSelection(questionType: QuestionType, block: Block): void {
    block.isSelected = !block.isSelected;
    this.questionTextContents[questionType] = this.parseBlocksIntoText(this.questionTextObj[questionType]);
    this.updateWordPreview();

    if (this.questionTextObj[questionType].blocks.filter((o: any) => o.isSelected === true).length === 0) {
      this.showToast('selectWord', this.currentLanguage);
    }
  }
  /* Fill Blacks & Drag Words */

  /* Save Question */
  validateQue(): boolean {
    const questionData = this.questions.find((q) => q.type === this.activeQuestionType);
    if (!this.activeQuestionType || !questionData) return false;

    if (!questionData.code.trim()) {
      return false;
    }

    if (!questionData.text.trim()) {
      return false;
    }

    if (this.activeQuestionType === QuestionType.CHOICE) {
      if (!questionData.options) {
        return false;
      }

      for (const option of questionData.options) {
        if (!this.isOptionValid(option)) {
          return false;
        }
      }

      if (questionData.options.length < 2) {
        return false;
      }

      if (!questionData.isMultipleChoice) {
        const correctOptions = questionData.options.filter((option) => option.isCorrect);
        if (correctOptions.length !== 1) {
          return false;
        }
      } else {
        const correctOptions = questionData.options.filter((option) => option.isCorrect);
        if (correctOptions.length < 1) {
          return false;
        }
      }
    }

    if (this.activeQuestionType === QuestionType.FILL_BLANKS) {
      const activeQuestionText = this.questionTextContents[this.activeQuestionType];

      if (!activeQuestionText || activeQuestionText.trim() === '') {
        return false;
      }
      if (this.questionTextObj[this.activeQuestionType].blocks.filter((o: any) => o.isSelected === true).length === 0) {
        return false;
      }
    }

    if ((!questionData.correctAnswerTip.trim()) || (!questionData.incorrectAnswerTip.trim())) {
      return false;
    }

    return true;
  }

  saveModal(): void {

    if (this.isSaving) {
      return;
    }

    const questionData = this.questions.find((q) => q.type === this.activeQuestionType);
    if (!questionData) return;


    let i = 0;
    if (questionData.type === QuestionType.CHOICE && questionData.options) {
      for (const option of questionData.options) {
        i++;
        if (!option.text.includes(`${i}-`)) {
          option.text = `${i}- ${option.text}`;
        }
      }
    }

    questionData.coursesIds = this.selectedCourses;
    if (!this.isEditQuestion) questionData.languageId = this.languageControl.value.id;

    this.loadingBarService.start();
    this.isSaving = true;

    if (!this.isEditQuestion) this.sendDataToBackend(questionData);
    else if (this.isEditQuestion) this.editQuestion(questionData);
  }

  getLanguages(): void {
    this.apiService.getLang().subscribe(
      (response) => {
        console.log('Response from API:', response);
      },
      (e) => {
        console.error('Error while sending data:', e.error.message);
      }
    );
  }

  sendDataToBackend(questionData: any): void {
    console.log("question data", questionData);
    this.apiService.createQuestion(questionData).subscribe(
      (response) => {
        const loadingTimer = setTimeout(() => {
          console.log('Response from API:', response.message);
          this.showToast('questionCreatedSuccessfully', this.currentLanguage);
          this.loadingBarService.complete();
          this.isSaving = false;

          this.router.navigateByUrl('/questions');

          clearTimeout(loadingTimer);
        }, this.loadingDuration);
      },
      (e) => {

        const loadingTimer = setTimeout(() => {
          console.error('Error while sending data:', e.error);

          this.showToast('failedToCreateQuestion', this.currentLanguage);

          this.loadingBarService.complete();
          this.isSaving = false;
          clearTimeout(loadingTimer);
        }, this.loadingDuration);
      }
    );
  }

  editQuestion(questionData: any): void {
    console.log("Edit question", questionData);
    this.apiService.editQuestion(questionData).subscribe(
      (response) => {
        const loadingTimer = setTimeout(() => {
          console.log('Response from API:', response.message);
          this.showToast('questionCreatedSuccessfully', this.currentLanguage);
          //this.loadingBarService.complete();
          //this.isSaving = false;

          //this.router.navigateByUrl('/questions');
          this.router.navigate(['/questions'], { queryParams: { lang: this.currentLanguage } }).then(() => {
            this.loadingBarService.complete();
            this.isLoading = false;
          });

          clearTimeout(loadingTimer);
        }, this.loadingDuration);
      },
      (e) => {

        const loadingTimer = setTimeout(() => {
          console.error('Error while sending data:', e.error.message);

          this.showToast('failedToCreateQuestion', this.currentLanguage);

          this.loadingBarService.complete();
          this.isSaving = false;
          clearTimeout(loadingTimer);
        }, this.loadingDuration);
      }
    );
  }

  areLangInvalid(): void {
    const selectedLanguage = this.languageControl.value;
    if (!selectedLanguage || !this.languages.some(language => language.id === selectedLanguage.id))
      this.showToast("selectLanguage", this.currentLanguage);
    return;
  }

  isQuestionEtatInitial(question: CreateQuestionData): boolean {
    if (question.text.trim() !== '' || question.code.trim() !== '' || question.correctAnswerTip.trim() !== '' || question.incorrectAnswerTip.trim() !== '') {
      return false;
    };
    if (question.type === QuestionType.CHOICE && question.options) {
      if (question.options.length !== 1) return false;
      else if (question.options[0].text.trim() !== '' || question.options[0].isCorrect) return false;
    }
    else if (question.type === QuestionType.FILL_BLANKS && question.isDragWords) return false;
    else if (question.type === QuestionType.TRUE_FALSE && question.isCorrect) return false;
    return true;
  }

  areDataInvalid(): void {
    const questionData = this.questions.find((q) => q.type === this.activeQuestionType);
    if (!this.activeQuestionType || !questionData) return;
    this.validateQuestion(this.activeQuestionType);

    questionData.code = questionData.code.trim();
    questionData.text = questionData.text.trim();
    questionData.correctAnswerTip = questionData.correctAnswerTip.trim();
    questionData.incorrectAnswerTip = questionData.incorrectAnswerTip.trim();


    if (questionData.code === '') return;
    else if (questionData.text === '' && this.activeQuestionType !== QuestionType.FILL_BLANKS) {
      return;
    }

    else if (this.activeQuestionType === QuestionType.CHOICE && !this.areOpenOptionsInvalid()) return;
    else if (this.activeQuestionType === QuestionType.FILL_BLANKS && !this.areTextBlockInvalid()) return;

    else if (questionData.correctAnswerTip === '' || questionData.incorrectAnswerTip === '') {
      if (!this.isTipsOpen(this.activeQuestionType)) this.toggleTips(this.activeQuestionType);
      return;
    }

    return;
  }

  areTextBlockInvalid(): boolean {

    if (!this.activeQuestionType) {
      return false;
    }


    this.questionTextContents[this.activeQuestionType] = this.questionTextContents[this.activeQuestionType].trim();

    if (!this.questionTextContents[this.activeQuestionType] || this.questionTextContents[this.activeQuestionType] === '') {
      if (!this.isBlockOpen(this.activeQuestionType)) {
        this.toggleBlock(this.activeQuestionType);
      }
      return false;
    }
    else if (this.questionTextObj[this.activeQuestionType].blocks.filter((o: any) => o.isSelected === true).length === 0) {
      if (!this.isBlockOpen(this.activeQuestionType)) {
        this.toggleBlock(this.activeQuestionType);
      }
      this.showToast('selectWord', this.currentLanguage);
      return false;
    }

    return true;
  }

  areOpenOptionsInvalid(): boolean {
    if (!this.activeQuestionType) {
      return false;
    }

    const activeQuestion = this.questions.find((q) => q.type === this.activeQuestionType);

    if (!activeQuestion || !activeQuestion.options) {
      return false;
    }

    if (activeQuestion.options) {
      for (const option of activeQuestion.options) {
        if (!this.isOptionValid(option)) {
          if (!this.isOptionOpen(activeQuestion.type, option.id)) {
            this.toggleOption(activeQuestion.type, option.id);
          }
          return false;
        }
      }
    }

    if (activeQuestion.options.length < 2) {
      this.showToast('atLeastTwoOptions', this.currentLanguage);
      return false;
    }

    else if (!activeQuestion.isMultipleChoice) {
      const correctOptions = activeQuestion.options.filter((option) => option.isCorrect);
      if (correctOptions.length !== 1) {
        this.showToast('oneOptionCorrect', this.currentLanguage);
        return false;
      }
    } else {
      const correctOptions = activeQuestion.options.filter((option) => option.isCorrect);
      if (correctOptions.length < 1) {
        this.showToast('atLeastOneOptionCorrect', this.currentLanguage);
        return false;
      }
    }
    return true;
  }

  isOptionValid(option: any): boolean {
    option.text = option.text.trim();
    return option.text && option.text !== '';
  }

  isCorrectTipTextValid(question: any): boolean {
    return question.correctAnswerTip && question.correctAnswerTip.trim() !== '';
  }

  isIncorrectTipTextValid(question: any): boolean {
    return question.incorrectAnswerTip && question.incorrectAnswerTip.trim() !== '';
  }
  /* Save Question */

  cancelEdit() {
    this.router.navigateByUrl('/questions');
  }
}
