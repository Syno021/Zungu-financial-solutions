import { ComponentFixture, TestBed } from '@angular/core/testing';
import { PatientCardPage } from './patient-card.page';

describe('PatientCardPage', () => {
  let component: PatientCardPage;
  let fixture: ComponentFixture<PatientCardPage>;

  beforeEach(() => {
    fixture = TestBed.createComponent(PatientCardPage);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
