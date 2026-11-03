// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, expect, it } from 'vitest';
import { PublicPhoto } from './public-photo';
afterEach(cleanup);
it('replaces inaccessible photos and recovers when the public source changes',()=>{
 const {rerender}=render(<PublicPhoto src="/reports/one/photo/before" alt="Before cleanup" width={600} height={400}/>);
 fireEvent.error(screen.getByAltText('Before cleanup'));
 expect(screen.queryByAltText('Before cleanup')).toBeNull();
 expect(screen.getByRole('img',{name:'Before cleanup — photo unavailable'})).toBeTruthy();
 rerender(<PublicPhoto src="/reports/two/photo/before" alt="Before cleanup" width={600} height={400}/>);
 expect(new URL(screen.getByAltText('Before cleanup').getAttribute('src')!, 'http://localhost:3000').pathname).toBe('/reports/two/photo/before');
});
