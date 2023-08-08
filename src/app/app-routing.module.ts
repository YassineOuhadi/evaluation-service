import { Component, NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { NewQueComponent } from './pages/home/home.component';
import { YourModalComponent } from './pages/create/create.component';
import { PlayQuizComponent } from './pages/play/play-quiz.component';

const routes: Routes = [
  {
    path: '',
    component: NewQueComponent
  },
  {
    path: 'create',
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
