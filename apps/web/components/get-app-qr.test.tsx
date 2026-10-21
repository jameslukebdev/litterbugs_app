// @vitest-environment jsdom
import { readFileSync } from 'node:fs';
import { render, cleanup } from '@testing-library/react';
import { afterEach, expect, it } from 'vitest';
import { GetAppQr } from './get-app-qr';
afterEach(cleanup);
it('renders the original permanent QR artwork immediately without an image download',()=>{
 const {getByRole,container}=render(<GetAppQr />);
 const svg=getByRole('img',{name:'QR code linking to litterbugs.app/get-app'});
 const original=readFileSync('public/brand/get-app-qr.svg','utf8');
 expect(svg.tagName.toLowerCase()).toBe('svg');
 expect(svg.querySelector('path')?.getAttribute('d')).toBe(original.match(/<path d="([^"]+)"/)?.[1]);
 expect(container.querySelector('img')).toBeNull();
});
