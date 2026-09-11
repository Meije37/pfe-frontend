import {
  Component, Input, AfterViewInit, OnChanges, OnDestroy,
  ViewChild, ElementRef, SimpleChanges
} from '@angular/core';
import { CommonModule } from '@angular/common';
import * as L from 'leaflet';

@Component({
  selector: 'app-location-map',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './location-map.html',
  styleUrl: './location-map.css'
})
export class LocationMapComponent implements AfterViewInit, OnChanges, OnDestroy {

  @Input() latitude!: number;
  @Input() longitude!: number;
  @Input() height = 180;
  @Input() adresseLabel = '';

  @ViewChild('previewMap') previewMapRef!: ElementRef<HTMLDivElement>;
  @ViewChild('fullMap')    fullMapRef!:    ElementRef<HTMLDivElement>;

  isFullscreenOpen = false;

  private previewInstance: any;
  private fullInstance: any;

  private static readonly TILE_URL =
    'https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png';
  private static readonly ATTRIBUTION =
    '&copy; OpenStreetMap &copy; CARTO';

  ngAfterViewInit(): void {
    this.initPreviewMap();
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (this.previewInstance && (changes['latitude'] || changes['longitude'])) {
      const pos: [number, number] = [this.latitude, this.longitude];
      this.previewInstance.setView(pos, 15);
      this.previewInstance.eachLayer((layer: any) => {
        if (layer instanceof L.Marker) layer.setLatLng(pos);
      });
    }
  }

  ngOnDestroy(): void {
    this.previewInstance?.remove();
    this.fullInstance?.remove();
  }

  private redIcon() {
    return L.divIcon({
      className: '',
      html: '<i class="fa-solid fa-location-dot" style="color:#dc2626;font-size:30px;filter:drop-shadow(0 1px 1px rgba(0,0,0,.35))"></i>',
      iconSize: [30, 30],
      iconAnchor: [15, 28]
    });
  }

  private initPreviewMap(): void {
    if (!this.previewMapRef) return;

    this.previewInstance = L.map(this.previewMapRef.nativeElement, {
      center: [this.latitude, this.longitude],
      zoom: 15,
      zoomControl: false,
      dragging: false,
      scrollWheelZoom: false,
      doubleClickZoom: false,
      touchZoom: false,
      boxZoom: false,
      keyboard: false,
      attributionControl: false
    });

    L.tileLayer(LocationMapComponent.TILE_URL, {
      subdomains: 'abcd',
      attribution: LocationMapComponent.ATTRIBUTION
    }).addTo(this.previewInstance);

    L.marker([this.latitude, this.longitude], { icon: this.redIcon() })
      .addTo(this.previewInstance);
  }

  ouvrirPleinEcran(): void {
    if (this.isFullscreenOpen) return; // évite un double-clic -> double carte/marqueur
    this.isFullscreenOpen = true;

    // Le conteneur plein écran vient de s'afficher (*ngIf) : on attend le
    // prochain cycle pour que Leaflet mesure une taille non nulle.
    setTimeout(() => {
      if (!this.fullMapRef) return;

      // Sécurité : si une instance précédente traîne encore, on la détruit
      this.fullInstance?.remove();

      this.fullInstance = L.map(this.fullMapRef.nativeElement, {
        center: [this.latitude, this.longitude],
        zoom: 16
      });

      L.tileLayer(LocationMapComponent.TILE_URL, {
        subdomains: 'abcd',
        attribution: LocationMapComponent.ATTRIBUTION
      }).addTo(this.fullInstance);

      L.marker([this.latitude, this.longitude], { icon: this.redIcon() })
        .addTo(this.fullInstance);

      this.fullInstance.invalidateSize();
    });
  }

  fermerPleinEcran(): void {
    this.fullInstance?.remove();
    this.fullInstance = null;
    this.isFullscreenOpen = false;
  }

  ouvrirGoogleMaps(): void {
    window.open(
      `https://www.google.com/maps/search/?api=1&query=${this.latitude},${this.longitude}`,
      '_blank'
    );
  }
}
