import { Component, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule, FormBuilder, Validators } from '@angular/forms';
import { AdminCategorieService } from '../../../services/admin-categorie.service';
import Swal from 'sweetalert2';

@Component({
  selector: 'app-categories-list',
  standalone: true,
  imports: [CommonModule, FormsModule, ReactiveFormsModule],
  templateUrl: './categories-list.html',
  styleUrl: './categories-list.css'
})
export class CategoriesListComponent implements OnInit {

  private service = inject(AdminCategorieService);
  private fb      = inject(FormBuilder);

  categories: any[] = [];
  loading   = true;
  showModal = false;
  editMode  = false;
  editId: number | null = null;

  // Champs exacts de l'entité CategorieReclamation :
  // nom, description, prioriteParDefaut
  form = this.fb.group({
    nom:               ['', Validators.required],
    description:       ['', Validators.required],
    prioriteParDefaut: [1, [Validators.required, Validators.min(1), Validators.max(5)]]
  });

  ngOnInit() {
    this.charger();
  }

  charger() {
    this.loading = true;
    this.service.getAll().subscribe({
      next: (data: any[]) => {
        this.categories = data;
        this.loading = false;
      },
      error: () => {
        this.loading = false;
        Swal.fire('Erreur', 'Impossible de charger les catégories.', 'error');
      }
    });
  }

  ouvrirCreation() {
    this.editMode = false;
    this.editId   = null;
    this.form.reset({ prioriteParDefaut: 1 });
    this.showModal = true;
  }

  ouvrirEdition(cat: any) {
    this.editMode = true;
    this.editId   = cat.idCategorie;
    this.form.patchValue({
      nom:               cat.nom,
      description:       cat.description,
      prioriteParDefaut: cat.prioriteParDefaut
    });
    this.showModal = true;
  }

  fermerModal() {
    this.showModal = false;
    this.form.reset({ prioriteParDefaut: 1 });
  }

  soumettre() {
    if (this.form.invalid) return;

    const data = this.form.value;

    if (this.editMode && this.editId) {
      this.service.update(this.editId, data).subscribe({
        next: () => {
          Swal.fire({ title: 'Succès !', text: 'Catégorie modifiée.', icon: 'success', confirmButtonColor: '#1d4ed8' });
          this.fermerModal();
          this.charger();
        },
        error: (err: any) => {
          Swal.fire('Erreur', err.error?.message || 'Erreur lors de la modification.', 'error');
        }
      });
    } else {
      this.service.create(data).subscribe({
        next: () => {
          Swal.fire({ title: 'Succès !', text: 'Catégorie créée avec succès.', icon: 'success', confirmButtonColor: '#1d4ed8' });
          this.fermerModal();
          this.charger();
        },
        error: (err: any) => {
          Swal.fire('Erreur', err.error?.message || 'Erreur lors de la création.', 'error');
        }
      });
    }
  }

  supprimer(cat: any) {
    Swal.fire({
      title: 'Supprimer cette catégorie ?',
      text: `"${cat.nom}" sera supprimée définitivement. Les réclamations associées ne seront pas supprimées.`,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonText: 'Supprimer',
      cancelButtonText: 'Annuler',
      confirmButtonColor: '#dc2626'
    }).then(result => {
      if (result.isConfirmed) {
        this.service.delete(cat.idCategorie).subscribe({
          next: () => {
            Swal.fire({ title: 'Supprimée !', text: 'Catégorie supprimée.', icon: 'success', confirmButtonColor: '#1d4ed8' });
            this.charger();
          },
          error: (err: any) => {
            Swal.fire('Erreur', err.error?.message || 'Impossible de supprimer cette catégorie.', 'error');
          }
        });
      }
    });
  }

  // Couleur badge priorité (1=basse → 5=critique)
  getPrioriteBadge(p: number): string {
    if (p >= 4) return 'bg-red-100 text-red-700 border border-red-200';
    if (p === 3) return 'bg-orange-100 text-orange-700 border border-orange-200';
    if (p === 2) return 'bg-yellow-100 text-yellow-700 border border-yellow-200';
    return 'bg-green-100 text-green-700 border border-green-200';
  }

  getPrioriteLabel(p: number): string {
    const map: Record<number, string> = {
      1: 'Basse',
      2: 'Normale',
      3: 'Moyenne',
      4: 'Haute',
      5: 'Critique'
    };
    return map[p] ?? p.toString();
  }
}
