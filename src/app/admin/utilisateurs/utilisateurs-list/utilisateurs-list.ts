import { Component, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { FormsModule, ReactiveFormsModule, FormBuilder, Validators } from '@angular/forms';
import { AdminUtilisateurService } from '../../../services/admin-utilisateur.service';
import { AdminServiceMunicipalService } from '../../../services/admin-service-municipal.service';
import { PaginationComponent } from '../../../shared/pagination/pagination';
import Swal from 'sweetalert2';

@Component({
  selector: 'app-utilisateurs-list',
  standalone: true,
  imports: [CommonModule, FormsModule, ReactiveFormsModule,RouterModule,PaginationComponent],
  templateUrl: './utilisateurs-list.html',
  styleUrl: './utilisateurs-list.css'
})
export class UtilisateursListComponent implements OnInit {

  private service        = inject(AdminUtilisateurService);
  private serviceService = inject(AdminServiceMunicipalService);
  private fb             = inject(FormBuilder);

  utilisateurs: any[] = [];
  services: any[]     = [];
  loading             = true;
  showModal           = false;
  editMode            = false;
  editId: number | null = null;

  filtreRole = '';
  roles      = ['', 'ADMIN', 'AGENT', 'CITOYEN'];
  recherche  = '';
  pageActuelle = 1;
  elementsParPage = 5;

  form = this.fb.group({
    nom:        ['', Validators.required],
    prenom:     ['', Validators.required],
    email:      ['', [Validators.required, Validators.email]],
    telephone:  ['', [Validators.required, Validators.pattern('^[234]\\d{7}$')]],
    motDePasse: ['', Validators.required],
    role:       ['CITOYEN', Validators.required],
    serviceId:  [null as number | null]
  });


  ngOnInit() {
    this.charger();
    this.chargerServices();
  }

  charger() {
    this.loading = true;
    this.service.getAll().subscribe({
      next: (data: any[]) => { this.utilisateurs = data; this.loading = false; },
      error: () => { this.loading = false; Swal.fire('Erreur', 'Impossible de charger les utilisateurs.', 'error'); }
    });
  }

  chargerServices() {
    this.serviceService.getAll().subscribe({
      next: (data: any[]) => this.services = data.filter(s => s.actif),
      error: () => {}
    });
  }

  get utilisateursFiltres(): any[] {
    let liste = this.utilisateurs;

    if (this.filtreRole) {
      liste = liste.filter(u => u.role === this.filtreRole);
    }

    if (this.recherche.trim()) {
      const terme = this.recherche.toLowerCase().trim();
      liste = liste.filter((u: any) =>
        u.nom?.toLowerCase().includes(terme) ||
        u.prenom?.toLowerCase().includes(terme) ||
        u.email?.toLowerCase().includes(terme) ||
        u.telephone?.toLowerCase().includes(terme)
      );
    }

    return liste;
  }

  // Vérifie si le rôle sélectionné dans le formulaire est AGENT
  get isAgentRole(): boolean {
    return this.form.get('role')?.value === 'AGENT';
  }

  ouvrirCreation() {
    this.editMode = false;
    this.editId   = null;
    this.form.reset({ role: 'CITOYEN', serviceId: null });
    this.form.get('motDePasse')?.setValidators(Validators.required);
    this.form.get('motDePasse')?.updateValueAndValidity();
    this.showModal = true;
  }

  ouvrirEdition(u: any) {
    this.editMode = true;
    this.editId   = u.id;
    this.form.patchValue({
      nom:       u.nom,
      prenom:    u.prenom,
      email:     u.email,
      telephone: u.telephone,
      role:      u.role,
      motDePasse: '',
      serviceId: u.serviceId ?? null
    });
    this.form.get('motDePasse')?.clearValidators();
    this.form.get('motDePasse')?.updateValueAndValidity();
    this.showModal = true;
  }

  fermerModal() {
    this.showModal = false;
    this.form.reset({ role: 'CITOYEN', serviceId: null });
  }

  soumettre() {
    if (this.form.invalid) return;
    const data: any = { ...this.form.value };
    if (this.editMode && !data.motDePasse) delete data.motDePasse;

    const obs = this.editMode && this.editId
      ? this.service.update(this.editId, data)
      : this.service.create(data);

    obs.subscribe({
      next: (res: any) => {
        // Si rôle AGENT et serviceId fourni → affecter au service
        if (data.role === 'AGENT' && data.serviceId) {
          const agentId = this.editMode ? this.editId! : res.id;
          this.service.affecterService(agentId, Number(data.serviceId)).subscribe({
            next: () => {},
            error: () => {}
          });
        }
        // Si rôle AGENT mais pas de service → retirer du service actuel
        if (data.role === 'AGENT' && !data.serviceId && this.editMode) {
          this.service.retirerService(this.editId!).subscribe({
            next: () => {},
            error: () => {}
          });
        }
        Swal.fire({
          title: 'Succès !',
          text: this.editMode ? 'Utilisateur modifié.' : 'Utilisateur créé avec succès.',
          icon: 'success',
          confirmButtonColor: '#1d4ed8'
        });
        this.fermerModal();
        this.charger();
      },
      error: (err: any) => Swal.fire('Erreur', err.error?.message || 'Erreur.', 'error')
    });
  }

  toggleActif(u: any) {
    const libelle = u.actif ? 'Désactiver' : 'Activer';
    Swal.fire({
      title: `${libelle} ce compte ?`,
      text: `${u.prenom} ${u.nom} — ${u.email}`,
      icon: 'warning', showCancelButton: true,
      confirmButtonText: libelle, cancelButtonText: 'Annuler',
      confirmButtonColor: u.actif ? '#dc2626' : '#1d4ed8'
    }).then(result => {
      if (result.isConfirmed) {
        const obs = u.actif ? this.service.desactiver(u.id) : this.service.activer(u.id);
        obs.subscribe({
          next: () => { Swal.fire({ title: 'Succès !', icon: 'success', confirmButtonColor: '#1d4ed8' }); this.charger(); },
          error: (err: any) => Swal.fire('Erreur', err.error?.message || 'Erreur.', 'error')
        });
      }
    });
  }

  supprimer(u: any) {
    Swal.fire({
      title: 'Supprimer ce compte ?',
      text: `${u.prenom} ${u.nom} sera supprimé définitivement.`,
      icon: 'warning', showCancelButton: true,
      confirmButtonText: 'Supprimer', cancelButtonText: 'Annuler', confirmButtonColor: '#dc2626'
    }).then(result => {
      if (result.isConfirmed) {
        this.service.delete(u.id).subscribe({
          next: () => { Swal.fire({ title: 'Supprimé !', icon: 'success', confirmButtonColor: '#1d4ed8' }); this.charger(); },
          error: (err: any) => Swal.fire('Erreur', err.error?.message || 'Erreur.', 'error')
        });
      }
    });
  }

  getRoleBadge(role: string): string {
    const map: Record<string, string> = {
      'ADMIN':   'bg-purple-100 text-purple-700 border border-purple-200',
      'AGENT':   'bg-blue-100 text-blue-700 border border-blue-200',
      'CITOYEN': 'bg-gray-100 text-gray-600 border border-gray-200'
    };
    return map[role] ?? 'bg-gray-100 text-gray-600';
  }

//  FONCTION POUR CHANGER DE PAGE
  onChangementPage(nouvellePage: number) {
    this.pageActuelle = nouvellePage;
  }

  onFiltreChange() {
    this.pageActuelle = 1;
  }

  resetRecherche() {
    this.recherche = '';
    this.pageActuelle = 1;
  }

get utilisateursFiltresEtPagines(): any[] {
    const listeFiltree = this.utilisateursFiltres;

    const maxPages = Math.ceil(listeFiltree.length / this.elementsParPage) || 1;
    if (this.pageActuelle > maxPages) {
      this.pageActuelle = 1;
    }

    const indexDebut = (this.pageActuelle - 1) * this.elementsParPage;
    const indexFin = indexDebut + this.elementsParPage;

    return listeFiltree.slice(indexDebut, indexFin);
  }
  get totalElementsFiltres(): number {
    return this.utilisateursFiltres.length;
  }
}
