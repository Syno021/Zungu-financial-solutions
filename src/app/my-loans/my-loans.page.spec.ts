import { ComponentFixture, TestBed } from '@angular/core/testing';
import { MyLoansPage } from './my-loans.page';

describe('MyLoansPage', () => {
  let component: MyLoansPage;
  let fixture: ComponentFixture<MyLoansPage>;

  beforeEach(() => {
    fixture = TestBed.createComponent(MyLoansPage);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
