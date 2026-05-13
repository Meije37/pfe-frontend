import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ReclamationsList } from './reclamations-list';

describe('ReclamationsList', () => {
  let component: ReclamationsList;
  let fixture: ComponentFixture<ReclamationsList>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ReclamationsList],
    }).compileComponents();

    fixture = TestBed.createComponent(ReclamationsList);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
