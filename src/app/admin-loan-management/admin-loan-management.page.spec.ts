import { ComponentFixture, TestBed } from '@angular/core/testing';
import { AdminLoanManagementPage } from './admin-loan-management.page';

describe('AdminLoanManagementPage', () => {
  let component: AdminLoanManagementPage;
  let fixture: ComponentFixture<AdminLoanManagementPage>;

  beforeEach(() => {
    fixture = TestBed.createComponent(AdminLoanManagementPage);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
