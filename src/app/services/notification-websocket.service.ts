import { Injectable, OnDestroy } from '@angular/core';
import { Client, IMessage } from '@stomp/stompjs';
import { Subject } from 'rxjs';
import { environment } from '../../environments/environment';
import { NotificationDTO } from './notification.service';

/**
 * Ouvre une connexion WebSocket/STOMP vers le backend et republie chaque
 * notification poussée par le serveur (voir NotificationService.creer côté
 * Spring) sous forme d'Observable. Purement additif : la lecture initiale
 * de la liste/compteur continue de passer par NotificationService (REST).
 *
 * Pas de SockJS ici : @stomp/stompjs ouvre un WebSocket natif directement,
 * ce qui correspond à l'endpoint /ws exposé sans SockJS côté Spring.
 */
@Injectable({ providedIn: 'root' })
export class NotificationWebSocketService implements OnDestroy {

  private client: Client | null = null;
  private readonly notificationRecue$ = new Subject<NotificationDTO>();

  /** Flux des notifications reçues en temps réel. */
  readonly notifications$ = this.notificationRecue$.asObservable();

  /**
   * Établit la connexion. À appeler une fois le token JWT disponible
   * (typiquement juste après login, ou au démarrage de l'app si déjà connecté).
   * Sans effet si déjà connecté.
   */
  connecter(): void {
    if (this.client?.active) {
      return;
    }

    const token = localStorage.getItem('token');
    if (!token) {
      return;
    }

    const wsUrl = environment.apiUrl.replace(/^http/, 'ws').replace(/\/api$/, '') + '/ws';

    this.client = new Client({
      brokerURL: wsUrl,
      connectHeaders: {
        Authorization: `Bearer ${token}`
      },
      reconnectDelay: 5000,
      heartbeatIncoming: 10000,
      heartbeatOutgoing: 10000,
      onConnect: () => {
        this.client?.subscribe('/user/queue/notifications', (message: IMessage) => {
          const notif: NotificationDTO = JSON.parse(message.body);
          this.notificationRecue$.next(notif);
        });
      }
    });

    this.client.activate();
  }

  /** À appeler au logout pour fermer proprement la connexion. */
  deconnecter(): void {
    this.client?.deactivate();
    this.client = null;
  }

  ngOnDestroy(): void {
    this.deconnecter();
  }
}
