import { ComponentFixture, TestBed } from '@angular/core/testing';

import { GoogleAccountAuthComponent } from './google-account-auth.component';

describe('GoogleAccountAuthComponent', () => {
  let component: GoogleAccountAuthComponent;
  let fixture: ComponentFixture<GoogleAccountAuthComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [GoogleAccountAuthComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(GoogleAccountAuthComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
