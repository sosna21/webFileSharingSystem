import { ComponentFixture, TestBed } from '@angular/core/testing';

import { MainActionBtnComponent } from './main-action-btn.component';

describe('MainActionBtnComponent', () => {
  let component: MainActionBtnComponent;
  let fixture: ComponentFixture<MainActionBtnComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [MainActionBtnComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(MainActionBtnComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
