import { ComponentFixture, TestBed } from '@angular/core/testing';
import { EhrPage } from './ehr.page';

describe('EhrPage', () => {
  let component: EhrPage;
  let fixture: ComponentFixture<EhrPage>;

  beforeEach(() => {
    fixture = TestBed.createComponent(EhrPage);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
