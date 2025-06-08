import { ComponentFixture, TestBed } from '@angular/core/testing';

import { SinglePlayerGameComponent } from './single-player-game.component';

describe('SinglePlayerGameComponent', () => {
  let component: SinglePlayerGameComponent;
  let fixture: ComponentFixture<SinglePlayerGameComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [SinglePlayerGameComponent]
    })
    .compileComponents();
    
    fixture = TestBed.createComponent(SinglePlayerGameComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
