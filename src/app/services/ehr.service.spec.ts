import { TestBed } from '@angular/core/testing';

import { EhrService } from './ehr.service';

describe('EhrService', () => {
  let service: EhrService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(EhrService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
