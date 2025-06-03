import { ComponentFixture, TestBed } from '@angular/core/testing';
import { LoansPage } from './loans.page';

describe('LoansPage', () => {
  let component: LoansPage;
  let fixture: ComponentFixture<LoansPage>;

  beforeEach(() => {
    fixture = TestBed.createComponent(LoansPage);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
