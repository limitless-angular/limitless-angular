import {
  afterNextRender,
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  signal,
  viewChild,
  ViewEncapsulation,
} from '@angular/core';

import { PortableTextTypeComponent } from '@limitless-angular/sanity/portabletext';

export interface Geopoint {
  _type: 'geopoint';
  lat: number;
  lng: number;
}

export interface MapMarker {
  _type: 'mapMarker';
  _key: string;
  position: Geopoint;
  title: string;
  description?: string;
}

export interface AnnotatedMapBlock {
  _type: 'annotatedMap';
  center?: Geopoint;
  markers?: MapMarker[];
}

@Component({
  selector: 'app-annotated-map',
  standalone: true,
  imports: [],
  template: `
    @if (isLoading()) {
      <div class="h-[400px] loading">
        <div>Loading map…</div>
      </div>
    }
    <div #mapContainer class="h-[400px]"></div>
  `,
  styles: [
    `
      .map-container {
        height: 400px;
      }
    `,
  ],
  // host: { ngSkipHydration: 'true' },
  encapsulation: ViewEncapsulation.None,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AnnotatedMapComponent extends PortableTextTypeComponent<AnnotatedMapBlock> {
  isLoading = signal(true);

  mapContainer = viewChild.required<ElementRef<HTMLDivElement>>('mapContainer');

  private L: typeof import('leaflet') | null = null;
  private map: import('leaflet').Map | null = null;

  constructor() {
    super();
    afterNextRender(async () => {
      await this.loadLeaflet();
    });
  }

  private async loadLeaflet() {
    this.L = await import('leaflet');
    this.isLoading.set(false);
    this.initializeMap();
  }

  private initializeMap() {
    if (!this.L) {
      return;
    }

    const center = this.value().center || { lat: 51.505, lng: -0.09 };
    this.map = this.L.map(this.mapContainer().nativeElement).setView(
      [center.lat, center.lng],
      13,
    );

    this.L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution:
        '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
    }).addTo(this.map);

    this.addMarkers();
  }

  private addMarkers() {
    if (!this.L || !this.map) {
      return;
    }

    for (const marker of this.value().markers ?? []) {
      const { lat, lng } = marker.position;
      this.L.marker([lat, lng]).addTo(this.map).bindPopup(marker.title);
    }
  }
}
