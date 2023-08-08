import { Component, NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { QuizAppComponent } from './pages/quiz/quiz.component';
import { NewQueComponent } from './pages/home/home.component';
import { YourModalComponent } from './components/modal/modal.component';
import { PlayQuizComponent } from './play-quiz/play-quiz.component';

const routes: Routes = [
  {
    path: '',
    component: NewQueComponent
  },
  {
    path: 'quiz',
    component: QuizAppComponent
  },
  {
    path: 'modal',
    component:YourModalComponent
  },
  {
    path: 'play',
    component: PlayQuizComponent
  }
];

@NgModule({
  imports: [RouterModule.forRoot(routes)],
  exports: [RouterModule]
})
export class AppRoutingModule { }
