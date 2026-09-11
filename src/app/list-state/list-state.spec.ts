import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ListState } from './list-state';

describe('ListState', () => {
  let component: ListState;
  let fixture: ComponentFixture<ListState>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ListState],
    }).compileComponents();

    fixture = TestBed.createComponent(ListState);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
