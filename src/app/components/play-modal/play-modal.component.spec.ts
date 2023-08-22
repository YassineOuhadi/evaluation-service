import { ComponentFixture, TestBed } from '@angular/core/testing';

import { PlayModalComponent } from './play-modal.component';

describe('PlayModalComponent', () => {
  let component: PlayModalComponent;
  let fixture: ComponentFixture<PlayModalComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ PlayModalComponent ]
    })
    .compileComponents();

    fixture = TestBed.createComponent(PlayModalComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
