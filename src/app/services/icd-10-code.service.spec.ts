import { TestBed } from '@angular/core/testing';

import { ICD10CodeService } from './icd-10-code.service';

describe('ICD10CodeService', () => {
  let service: ICD10CodeService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(ICD10CodeService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
