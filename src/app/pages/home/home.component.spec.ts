import { ComponentFixture, TestBed } from '@angular/core/testing';

import { NewQueComponent } from './home.component';

describe('QuizAppComponent', () => {
  let component: NewQueComponent;
  let fixture: ComponentFixture<NewQueComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ NewQueComponent ]
    })
    .compileComponents();

    fixture = TestBed.createComponent(NewQueComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
