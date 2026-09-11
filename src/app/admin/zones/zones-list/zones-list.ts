import { Component, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule, FormBuilder, Validators } from '@angular/forms';
import { AdminZoneService } from '../../../services/admin-zone.service';
import { PaginationComponent } from '../../../shared/pagination/pagination';
import Swal from 'sweetalert2';

@Component({
  selector: 'app-zones-list',
  standalone: true,
  imports: [CommonModule, FormsModule, ReactiveFormsModule, PaginationComponent],
  templateUrl: './zones-list.html',
  styleUrl: './zones-list.css'
})
export class ZonesListComponent implements OnInit {

  private service = inject(AdminZoneService);
  private fb      = inject(FormBuilder);

  zones: any[]  = [];
  loading       = true;
  showModal     = false;
  editMode      = false;
  editId: number | null = null;

  filtreType = '';
  typesZone  = ['', 'WILAYA', 'MOUGHATAA', 'COMMUNE', 'QUARTIER'];
  recherche  = '';

  // Pagination (sur la liste déjà filtrée par type + recherche)
  currentPage  = 1;
  itemsPerPage = 10;

  get zonesFiltrees(): any[] {
    let liste = this.zones;

    if (this.filtreType) {
      liste = liste.filter(z => z.typeZone === this.filtreType);
    }

    if (this.recherche.trim()) {
      const terme = this.recherche.toLowerCase().trim();
      liste = liste.filter((z: any) =>
        z.nom?.toLowerCase().includes(terme) ||
        z.description?.toLowerCase().includes(terme)
      );
    }

    return liste;
  }

  get zonesPaginees(): any[] {
    const debut = (this.currentPage - 1) * this.itemsPerPage;
    return this.zonesFiltrees.slice(debut, debut + this.itemsPerPage);
  }

  onPageChange(page: number) {
    this.currentPage = page;
  }

  onFiltreChange() {
    this.currentPage = 1;
  }

  resetRecherche() {
    this.recherche = '';
    this.currentPage = 1;
  }

  form = this.fb.group({
    nom:         ['', Validators.required],
    typeZone:    ['COMMUNE', Validators.required],
    description: ['', Validators.required]
  });

  ngOnInit() {
    this.charger();
  }

  charger() {
    this.loading = true;
    this.service.getAll().subscribe({
      next: (data: any[]) => {
        this.zones = data;
        this.currentPage = 1;
        this.loading = false;
      },
      error: () => {
        this.loading = false;
        Swal.fire('Erreur', 'Impossible de charger les zones.', 'error');
      }
    });
  }

  ouvrirCreation() {
    this.editMode = false;
    this.editId   = null;
    this.form.reset({ typeZone: 'COMMUNE' });
    this.showModal = true;
  }

  ouvrirEdition(z: any) {
    this.editMode = true;
    this.editId   = z.id;
    this.form.patchValue({ nom: z.nom, typeZone: z.typeZone, description: z.description });
    this.showModal = true;
  }

  fermerModal() {
    this.showModal = false;
    this.form.reset({ typeZone: 'COMMUNE' });
  }

  soumettre() {
    if (this.form.invalid) return;
    const data = this.form.value;
    if (this.editMode && this.editId) {
      this.service.update(this.editId, data).subscribe({
        next: () => {
          Swal.fire({ title: 'Succès !', text: 'Zone modifiée avec succès.', icon: 'success', confirmButtonColor: '#1d4ed8' });
          this.fermerModal(); this.charger();
        },
        error: (err: any) => Swal.fire('Erreur', err.error?.message || 'Erreur lors de la modification.', 'error')
      });
    } else {
      this.service.create(data).subscribe({
        next: () => {
          Swal.fire({ title: 'Succès !', text: 'Zone créée avec succès.', icon: 'success', confirmButtonColor: '#1d4ed8' });
          this.fermerModal(); this.charger();
        },
        error: (err: any) => Swal.fire('Erreur', err.error?.message || 'Erreur lors de la création.', 'error')
      });
    }
  }

  supprimer(z: any) {
    Swal.fire({
      title: 'Supprimer cette zone ?',
      text: `"${z.nom}" sera supprimée définitivement. Les services associés peuvent être affectés.`,
      icon: 'warning', showCancelButton: true,
      confirmButtonText: 'Supprimer', cancelButtonText: 'Annuler', confirmButtonColor: '#dc2626'
    }).then(result => {
      if (result.isConfirmed) {
        this.service.delete(z.id).subscribe({
          next: () => {
            Swal.fire({ title: 'Supprimée !', text: 'Zone supprimée.', icon: 'success', confirmButtonColor: '#1d4ed8' });
            this.charger();
          },
          error: (err: any) => Swal.fire('Erreur', err.error?.message || 'Impossible de supprimer cette zone.', 'error')
        });
      }
    });
  }

  getTypeBadge(type: string): string {
    const map: Record<string, string> = {
      'WILAYA':    'bg-purple-100 text-purple-700 border border-purple-200',
      'MOUGHATAA': 'bg-blue-100 text-blue-700 border border-blue-200',
      'COMMUNE':   'bg-green-100 text-green-700 border border-green-200',
      'QUARTIER':  'bg-orange-100 text-orange-700 border border-orange-200'
    };
    return map[type] ?? 'bg-gray-100 text-gray-600 border border-gray-200';
  }

  getTypeIcon(type: string): string {
    const map: Record<string, string> = {
      'WILAYA':    'fa-solid fa-map',
      'MOUGHATAA': 'fa-solid fa-map-location',
      'COMMUNE':   'fa-solid fa-city',
      'QUARTIER':  'fa-solid fa-map-location-dot'
    };
    return map[type] ?? 'fa-solid fa-location-dot';
  }
}
