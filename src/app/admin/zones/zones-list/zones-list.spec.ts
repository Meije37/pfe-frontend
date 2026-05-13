import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ZonesList } from './zones-list';

describe('ZonesList', () => {
  let component: ZonesList;
  let fixture: ComponentFixture<ZonesList>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ZonesList],
    }).compileComponents();

    fixture = TestBed.createComponent(ZonesList);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
