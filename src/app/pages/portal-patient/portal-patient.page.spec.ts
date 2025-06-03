import { ComponentFixture, TestBed } from '@angular/core/testing';
import { PortalPatientPage } from './portal-patient.page';

describe('PortalPatientPage', () => {
  let component: PortalPatientPage;
  let fixture: ComponentFixture<PortalPatientPage>;

  beforeEach(() => {
    fixture = TestBed.createComponent(PortalPatientPage);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
