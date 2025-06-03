import { ComponentFixture, TestBed } from '@angular/core/testing';
import { AddEhrPage } from './add-ehr.page';

describe('AddEhrPage', () => {
  let component: AddEhrPage;
  let fixture: ComponentFixture<AddEhrPage>;

  beforeEach(() => {
    fixture = TestBed.createComponent(AddEhrPage);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
