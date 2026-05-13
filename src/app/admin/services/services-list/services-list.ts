import { Component, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule, FormBuilder, Validators } from '@angular/forms';
import { AdminServiceMunicipalService } from '../../../services/admin-service-municipal.service';
import { AdminZoneService } from '../../../services/admin-zone.service';
import Swal from 'sweetalert2';

@Component({
  selector: 'app-services-list',
  standalone: true,
  imports: [CommonModule, FormsModule, ReactiveFormsModule],
  templateUrl: './services-list.html',
  styleUrl: './services-list.css'
})
export class ServicesListComponent implements OnInit {

  private service     = inject(AdminServiceMunicipalService);
  private zoneService = inject(AdminZoneService);
  private fb          = inject(FormBuilder);

  services: any[] = [];
  zones: any[]    = [];
  loading         = true;
  showModal       = false;
  editMode        = false;
  editId: number | null = null;

  filtreZoneId = '';

  form = this.fb.group({
    nom:          ['', Validators.required],
    description:  ['', Validators.required],
    emailService: ['', [Validators.required, Validators.email]],
    actif:        [true],
    zoneId:       [null as number | null, Validators.required]
  });

  ngOnInit() {
    this.charger();
    this.chargerZones();
  }

  charger() {
    this.loading = true;
    this.service.getAll().subscribe({
      next: (data: any[]) => { this.services = data; this.loading = false; },
      error: () => {
        this.loading = false;
        Swal.fire('Erreur', 'Impossible de charger les services.', 'error');
      }
    });
  }

  chargerZones() {
    this.zoneService.getAll().subscribe({
      next: (data: any[]) => this.zones = data,
      error: () => {}
    });
  }

 get servicesFiltres(): any[] {
   if (!this.filtreZoneId) return this.services;
   return this.services.filter(s => s.zoneId === Number(this.filtreZoneId));
 }
  ouvrirCreation() {
    this.editMode = false;
    this.editId   = null;
    this.form.reset({ actif: true, zoneId: null });
    this.showModal = true;
  }

  ouvrirEdition(s: any) {
    this.editMode = true;
    this.editId   = s.id;
   this.form.patchValue({
     nom: s.nom,
     description: s.description,
     emailService: s.emailService,
     actif: s.actif,
     zoneId: s.zoneId
   });
    this.showModal = true;
  }

  fermerModal() {
    this.showModal = false;
    this.form.reset({ actif: true, zoneId: null });
  }

  soumettre() {
    if (this.form.invalid) return;
    const data = this.form.value;
    if (this.editMode && this.editId) {
      this.service.update(this.editId, data).subscribe({
        next: () => {
          Swal.fire({ title: 'Succès !', text: 'Service modifié avec succès.', icon: 'success', confirmButtonColor: '#1d4ed8' });
          this.fermerModal(); this.charger();
        },
        error: (err: any) => Swal.fire('Erreur', err.error?.message || 'Erreur lors de la modification.', 'error')
      });
    } else {
      this.service.create(data).subscribe({
        next: () => {
          Swal.fire({ title: 'Succès !', text: 'Service créé avec succès.', icon: 'success', confirmButtonColor: '#1d4ed8' });
          this.fermerModal(); this.charger();
        },
        error: (err: any) => Swal.fire('Erreur', err.error?.message || 'Erreur lors de la création.', 'error')
      });
    }
  }

  toggleActif(s: any) {
    const action  = s.actif ? 'désactiver' : 'activer';
    const libelle = s.actif ? 'Désactiver' : 'Activer';
    Swal.fire({
      title: `${libelle} ce service ?`,
      text: `Le service "${s.nom}" sera ${action === 'activer' ? 'activé' : 'désactivé'}.`,
      icon: 'warning', showCancelButton: true,
      confirmButtonText: libelle, cancelButtonText: 'Annuler',
      confirmButtonColor: s.actif ? '#dc2626' : '#1d4ed8'
    }).then(result => {
      if (result.isConfirmed) {
      this.service.update(s.id, {
        nom: s.nom,
        description: s.description,
        emailService: s.emailService,
        zoneId: s.zoneId,          // ← déjà à plat dans le DTO
        actif: !s.actif
      }).subscribe({
          next: () => {
            Swal.fire({ title: 'Succès !', text: `Service ${action === 'activer' ? 'activé' : 'désactivé'}.`, icon: 'success', confirmButtonColor: '#1d4ed8' });
            this.charger();
          },
          error: (err: any) => Swal.fire('Erreur', err.error?.message || 'Erreur.', 'error')
        });
      }
    });
  }

  supprimer(s: any) {
    Swal.fire({
      title: 'Supprimer ce service ?',
      text: `"${s.nom}" sera supprimé définitivement.`,
      icon: 'warning', showCancelButton: true,
      confirmButtonText: 'Supprimer', cancelButtonText: 'Annuler', confirmButtonColor: '#dc2626'
    }).then(result => {
      if (result.isConfirmed) {
        this.service.delete(s.id).subscribe({
          next: () => {
            Swal.fire({ title: 'Supprimé !', text: 'Service supprimé.', icon: 'success', confirmButtonColor: '#1d4ed8' });
            this.charger();
          },
          error: (err: any) => Swal.fire('Erreur', err.error?.message || 'Impossible de supprimer ce service.', 'error')
        });
      }
    });
  }
}
