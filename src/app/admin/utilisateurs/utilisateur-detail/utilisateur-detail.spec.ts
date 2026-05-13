import { ComponentFixture, TestBed } from '@angular/core/testing';

import { UtilisateurDetail } from './utilisateur-detail';

describe('UtilisateurDetail', () => {
  let component: UtilisateurDetail;
  let fixture: ComponentFixture<UtilisateurDetail>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [UtilisateurDetail],
    }).compileComponents();

    fixture = TestBed.createComponent(UtilisateurDetail);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
