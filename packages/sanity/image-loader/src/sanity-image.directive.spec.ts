import { Component, signal, viewChild } from '@angular/core';
import { render } from '@testing-library/angular';

import { SANITY_CONFIG } from '@limitless-angular/sanity/shared';
import { SanityImage } from './sanity-image.directive';

type DirectiveInputMetadata = {
  inputs: Record<string, unknown>;
};

const sanityConfig = {
  projectId: 'k4hg38xw',
  dataset: 'demo',
};

@Component({
  imports: [SanityImage],
  template: `
    <img
      [sanityImage]="image()"
      [width]="200"
      [height]="300"
      [quality]="75"
      alt="Sanity image"
    />
  `,
})
class SanityImageHost {
  readonly directive = viewChild.required(SanityImage);
  readonly image = signal(
    'image-Tb9Ew8CXIwaY6R1kjMvI0uRR-2000x3000-jpg',
  );
}

@Component({
  imports: [SanityImage],
  template: `
    <img
      [sanityImage]="image"
      [loaderParams]="loaderParams"
      width="200"
      height="300"
      alt="Sanity image"
    />
  `,
})
class SanityImageLoaderParamsHost {
  readonly directive = viewChild.required(SanityImage);
  readonly image = 'image-Tb9Ew8CXIwaY6R1kjMvI0uRR-2000x3000-jpg';
  readonly loaderParams = { fit: 'crop' };
}

@Component({
  imports: [SanityImage],
  template: `
    <img
      [sanityImage]="image"
      [loaderParams]="loaderParams()"
      [width]="width()"
      [height]="height()"
      [quality]="quality()"
      alt="Sanity image"
    />
  `,
})
class MutableSanityImageHost {
  readonly directive = viewChild.required(SanityImage);
  readonly image = 'image-Tb9Ew8CXIwaY6R1kjMvI0uRR-2000x3000-jpg';
  readonly loaderParams = signal({ fit: 'crop' });
  readonly width = signal(200);
  readonly height = signal(300);
  readonly quality = signal(75);
}

function directiveInputs() {
  return (SanityImage as unknown as { ɵdir: DirectiveInputMetadata }).ɵdir
    .inputs;
}

function imageSearchParams(fixture: { componentInstance: MutableSanityImageHost }) {
  return new URL(fixture.componentInstance.directive().ngSrc).searchParams;
}

function renderedImageSearchParams(fixture: { nativeElement: HTMLElement }) {
  const image = fixture.nativeElement.querySelector('img');

  expect(image).not.toBeNull();

  return new URL((image as HTMLImageElement).src).searchParams;
}

describe('SanityImage', () => {
  it('exposes ngSrc as a directive input', () => {
    expect(directiveInputs()).toHaveProperty('ngSrc');
  });

  it('exposes loaderParams as a directive input', () => {
    expect(directiveInputs()).toHaveProperty('loaderParams');
  });

  it('sets ngSrc from the bound Sanity image before initialization', async () => {
    const { fixture } = await render(SanityImageHost, {
      providers: [{ provide: SANITY_CONFIG, useValue: sanityConfig }],
    });

    await fixture.whenStable();

    const directive = fixture.componentInstance.directive();

    expect(directive.ngSrc).toBe(
      'https://cdn.sanity.io/images/k4hg38xw/demo/Tb9Ew8CXIwaY6R1kjMvI0uRR-2000x3000.jpg?w=200&h=300&q=75',
    );
  });

  it('updates ngSrc when the bound Sanity image changes', async () => {
    const { fixture } = await render(SanityImageHost, {
      providers: [{ provide: SANITY_CONFIG, useValue: sanityConfig }],
    });

    await fixture.whenStable();

    fixture.componentInstance.image.set(
      'image-G3i4emG6B8JnTmGoN0UjgAp8-3000x2000-jpg',
    );
    await fixture.whenStable();

    const directive = fixture.componentInstance.directive();

    expect(directive.ngSrc).toBe(
      'https://cdn.sanity.io/images/k4hg38xw/demo/G3i4emG6B8JnTmGoN0UjgAp8-3000x2000.jpg?w=200&h=300&q=75',
    );
  });

  it('uses bound loaderParams when generating ngSrc', async () => {
    const { fixture } = await render(SanityImageLoaderParamsHost, {
      providers: [{ provide: SANITY_CONFIG, useValue: sanityConfig }],
    });

    await fixture.whenStable();

    const directive = fixture.componentInstance.directive();
    const url = new URL(directive.ngSrc);

    expect(directive.loaderParams).toEqual({ fit: 'crop' });
    expect(url.searchParams.get('fit')).toBe('crop');
  });

  it('updates ngSrc when quality changes', async () => {
    const { fixture } = await render(MutableSanityImageHost, {
      providers: [{ provide: SANITY_CONFIG, useValue: sanityConfig }],
    });

    await fixture.whenStable();

    fixture.componentInstance.quality.set(85);
    await fixture.whenStable();

    expect(imageSearchParams(fixture).get('q')).toBe('85');
    expect(renderedImageSearchParams(fixture).get('q')).toBe('85');
  });

  it('updates ngSrc when loaderParams changes', async () => {
    const { fixture } = await render(MutableSanityImageHost, {
      providers: [{ provide: SANITY_CONFIG, useValue: sanityConfig }],
    });

    await fixture.whenStable();

    fixture.componentInstance.loaderParams.set({ fit: 'clip' });
    await fixture.whenStable();

    expect(imageSearchParams(fixture).get('fit')).toBe('clip');
  });

  it('updates ngSrc when dimensions change', async () => {
    const { fixture } = await render(MutableSanityImageHost, {
      providers: [{ provide: SANITY_CONFIG, useValue: sanityConfig }],
    });

    await fixture.whenStable();

    fixture.componentInstance.width.set(400);
    fixture.componentInstance.height.set(500);
    await fixture.whenStable();

    const searchParams = imageSearchParams(fixture);
    const renderedSearchParams = renderedImageSearchParams(fixture);

    expect(searchParams.get('w')).toBe('400');
    expect(searchParams.get('h')).toBe('500');
    expect(renderedSearchParams.get('w')).toBe('400');
    expect(renderedSearchParams.get('h')).toBe('500');
  });
});
