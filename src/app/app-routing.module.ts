import { Component, NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { NewQueComponent } from './pages/home/home.component';
import { CreateComponent } from './pages/create/create.component';
import { PlayComponent } from './pages/play/play.component';
import { QuestionsComponent } from './pages/questions/questions.component';


const routes: Routes = [
  {
    path: '',
    component: NewQueComponent
  },
  {
    path: 'questions',
    component:QuestionsComponent
  },
  {
    path: 'create',
    component:CreateComponent
  },
  {
    path: 'play',
    component: PlayComponent
  }
];

@NgModule({
  imports: [RouterModule.forRoot(routes)],
  exports: [RouterModule]
})
export class AppRoutingModule { }
