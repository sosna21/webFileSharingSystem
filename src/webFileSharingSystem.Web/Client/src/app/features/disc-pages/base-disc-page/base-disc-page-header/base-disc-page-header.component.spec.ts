import { ComponentFixture, TestBed } from '@angular/core/testing';

import { BaseDiscPageHeaderComponent } from './base-disc-page-header.component';

describe('BaseDiscPageHeaderComponent', () => {
  let component: BaseDiscPageHeaderComponent;
  let fixture: ComponentFixture<BaseDiscPageHeaderComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [BaseDiscPageHeaderComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(BaseDiscPageHeaderComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
