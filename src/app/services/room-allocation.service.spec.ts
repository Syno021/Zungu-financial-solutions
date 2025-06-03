import { TestBed } from '@angular/core/testing';

import { RoomAllocationService } from './room-allocation.service';

describe('RoomAllocationService', () => {
  let service: RoomAllocationService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(RoomAllocationService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
