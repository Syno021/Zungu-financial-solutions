import { ComponentFixture, TestBed } from '@angular/core/testing';
import { EhrDetailModalPage } from './ehr-detail-modal.page';

describe('EhrDetailModalPage', () => {
  let component: EhrDetailModalPage;
  let fixture: ComponentFixture<EhrDetailModalPage>;

  beforeEach(() => {
    fixture = TestBed.createComponent(EhrDetailModalPage);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
