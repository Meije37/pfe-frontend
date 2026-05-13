import { ComponentFixture, TestBed } from '@angular/core/testing';

import { UtilisateursList } from './utilisateurs-list';

describe('UtilisateursList', () => {
  let component: UtilisateursList;
  let fixture: ComponentFixture<UtilisateursList>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [UtilisateursList],
    }).compileComponents();

    fixture = TestBed.createComponent(UtilisateursList);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
