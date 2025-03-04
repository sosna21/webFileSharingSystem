import { ComponentFixture, TestBed } from '@angular/core/testing';

import { CardSecondaryContentComponent } from './card-secondary-content.component';

describe('CardSecondaryContentComponent', () => {
  let component: CardSecondaryContentComponent;
  let fixture: ComponentFixture<CardSecondaryContentComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [CardSecondaryContentComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(CardSecondaryContentComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
