import { ComponentFixture, TestBed } from '@angular/core/testing';

import { YourModalComponent } from './modal.component';

describe('YourModalComponent', () => {
  let component: YourModalComponent;
  let fixture: ComponentFixture<YourModalComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ YourModalComponent ]
    })
    .compileComponents();

    fixture = TestBed.createComponent(YourModalComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
