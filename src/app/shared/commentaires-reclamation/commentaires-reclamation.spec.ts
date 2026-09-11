import { ComponentFixture, TestBed } from '@angular/core/testing';

import { CommentairesReclamation } from './commentaires-reclamation';

describe('CommentairesReclamation', () => {
  let component: CommentairesReclamation;
  let fixture: ComponentFixture<CommentairesReclamation>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [CommentairesReclamation],
    }).compileComponents();

    fixture = TestBed.createComponent(CommentairesReclamation);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
