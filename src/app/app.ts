import { Component, signal } from '@angular/core';
import { RouterOutlet } from '@angular/router';

@Component({
  selector: 'app-root',
  standalone: true, // Angular 21 est standalone par défaut
  imports: [RouterOutlet], // Indispensable pour reconnaître <router-outlet>
  templateUrl: './app.html', // Vérifie que le nom du fichier est identique
  styleUrl: './app.css'
// styleUrl: '../styles.css' // Note le ../ pour sortir du dossier app
})
export class App {
  protected readonly title = signal('pfe-frontend');
}
