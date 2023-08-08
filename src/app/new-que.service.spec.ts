import { TestBed } from '@angular/core/testing';

import { NewQueService } from './new-que.service';

describe('NewQueService', () => {
  let service: NewQueService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(NewQueService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
