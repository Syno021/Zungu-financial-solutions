import { ComponentFixture, TestBed } from '@angular/core/testing';
import { FacilitiesPage } from './facilities.page';

describe('FacilitiesPage', () => {
  let component: FacilitiesPage;
  let fixture: ComponentFixture<FacilitiesPage>;

  beforeEach(() => {
    fixture = TestBed.createComponent(FacilitiesPage);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
