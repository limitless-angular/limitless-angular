import { ComponentFixture, TestBed } from '@angular/core/testing';
import { SanityComponent } from './sanity.component';

describe('SanityComponent', () => {
  let component: SanityComponent;
  let fixture: ComponentFixture<SanityComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [SanityComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(SanityComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
