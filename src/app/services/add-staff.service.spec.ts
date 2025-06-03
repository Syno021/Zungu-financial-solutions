import { TestBed } from '@angular/core/testing';

import { AddStaffService } from './add-staff.service';

describe('AddStaffService', () => {
  let service: AddStaffService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(AddStaffService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
