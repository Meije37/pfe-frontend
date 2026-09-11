import { Component, OnInit, OnDestroy, inject, HostListener, ElementRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Subscription } from 'rxjs';
import { NotificationService, NotificationDTO } from '../../services/notification.service';
import { NotificationWebSocketService } from '../../services/notification-websocket.service';

@Component({
  selector: 'app-notification-bell',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './notification-bell.html',
  styleUrl: './notification-bell.css'
})
export class NotificationBellComponent implements OnInit, OnDestroy {

  private notificationService = inject(NotificationService);
  private notificationWs = inject(NotificationWebSocketService);
  private elementRef = inject(ElementRef);

  ouvert = false;
  notifications: NotificationDTO[] = [];
  nombreNonLues = 0;
  chargement = false;

  private wsSubscription?: Subscription;

  ngOnInit() {
    // Chargement initial par REST (source de vérité au démarrage).
    this.chargerCompteur();

    // Puis mises à jour en temps réel via STOMP : plus de polling.
    this.notificationWs.connecter();
    this.wsSubscription = this.notificationWs.notifications$.subscribe(notif => {
      this.nombreNonLues++;
      // Si le menu est déjà ouvert, on insère la notification en tête
      // pour un affichage immédiat sans nouvel appel REST.
      if (this.ouvert) {
        this.notifications = [notif, ...this.notifications];
      }
    });
  }

  ngOnDestroy() {
    this.wsSubscription?.unsubscribe();
  }

  // Ferme le menu si on clique en dehors
  @HostListener('document:click', ['$event'])
  onClickDehors(event: MouseEvent) {
    if (this.ouvert && !this.elementRef.nativeElement.contains(event.target)) {
      this.ouvert = false;
    }
  }

  chargerCompteur() {
    this.notificationService.compterNonLues().subscribe({
      next: (res) => this.nombreNonLues = res.count,
      error: () => {}
    });
  }

  toggleMenu() {
    this.ouvert = !this.ouvert;
    if (this.ouvert) {
      this.chargerNotifications();
    }
  }

  chargerNotifications() {
    this.chargement = true;
    this.notificationService.mesNotifications().subscribe({
      next: (data) => {
        this.notifications = data;
        this.chargement = false;
      },
      error: () => this.chargement = false
    });
  }

  ouvrirNotification(notif: NotificationDTO) {
    if (!notif.lu) {
      this.notificationService.marquerCommeLue(notif.id).subscribe(() => {
        notif.lu = true;
        this.nombreNonLues = Math.max(0, this.nombreNonLues - 1);
      });
    }
  }

  toutMarquerCommeLu() {
    this.notificationService.marquerToutesCommeLues().subscribe(() => {
      this.notifications.forEach(n => n.lu = true);
      this.nombreNonLues = 0;
    });
  }
}
