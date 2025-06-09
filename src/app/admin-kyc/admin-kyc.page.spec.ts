import { ComponentFixture, TestBed } from '@angular/core/testing';
import { AdminKycPage } from './admin-kyc.page';

describe('AdminKycPage', () => {
  let component: AdminKycPage;
  let fixture: ComponentFixture<AdminKycPage>;

  beforeEach(() => {
    fixture = TestBed.createComponent(AdminKycPage);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
