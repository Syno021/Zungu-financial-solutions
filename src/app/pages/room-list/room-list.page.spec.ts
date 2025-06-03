import { ComponentFixture, TestBed } from '@angular/core/testing';
import { RoomListPage } from './room-list.page';

describe('RoomListPage', () => {
  let component: RoomListPage;
  let fixture: ComponentFixture<RoomListPage>;

  beforeEach(() => {
    fixture = TestBed.createComponent(RoomListPage);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
