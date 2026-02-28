import { ComponentFixture, TestBed } from '@angular/core/testing';

import { SpaceUsageBarComponent } from './space-usage-bar.component';

describe('SpaceUsageBarComponent', () => {
  let component: SpaceUsageBarComponent;
  let fixture: ComponentFixture<SpaceUsageBarComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [SpaceUsageBarComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(SpaceUsageBarComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
