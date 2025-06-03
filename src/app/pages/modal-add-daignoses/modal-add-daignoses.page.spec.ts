import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ModalAddDaignosesPage } from './modal-add-daignoses.page';

describe('ModalAddDaignosesPage', () => {
  let component: ModalAddDaignosesPage;
  let fixture: ComponentFixture<ModalAddDaignosesPage>;

  beforeEach(() => {
    fixture = TestBed.createComponent(ModalAddDaignosesPage);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
