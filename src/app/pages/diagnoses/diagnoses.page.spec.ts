import { ComponentFixture, TestBed } from '@angular/core/testing';
import { DiagnosesPage } from './diagnoses.page';

describe('DiagnosesPage', () => {
  let component: DiagnosesPage;
  let fixture: ComponentFixture<DiagnosesPage>;

  beforeEach(() => {
    fixture = TestBed.createComponent(DiagnosesPage);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
