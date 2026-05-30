import { ComponentFixture, TestBed } from '@angular/core/testing';

import { AgentProfil } from './agent-profil';

describe('AgentProfil', () => {
  let component: AgentProfil;
  let fixture: ComponentFixture<AgentProfil>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [AgentProfil],
    }).compileComponents();

    fixture = TestBed.createComponent(AgentProfil);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
