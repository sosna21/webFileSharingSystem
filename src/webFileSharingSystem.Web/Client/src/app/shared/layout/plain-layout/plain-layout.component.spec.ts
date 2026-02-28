import { ComponentFixture, TestBed } from '@angular/core/testing';

import { PlainLayoutComponent } from './plain-layout.component';

describe('PlainLayoutComponent', () => {
  let component: PlainLayoutComponent;
  let fixture: ComponentFixture<PlainLayoutComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [PlainLayoutComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(PlainLayoutComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
