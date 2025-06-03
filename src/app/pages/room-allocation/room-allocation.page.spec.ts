import { ComponentFixture, TestBed } from '@angular/core/testing';
import { RoomAllocationPage } from './room-allocation.page';

describe('RoomAllocationPage', () => {
  let component: RoomAllocationPage;
  let fixture: ComponentFixture<RoomAllocationPage>;

  beforeEach(() => {
    fixture = TestBed.createComponent(RoomAllocationPage);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
