// @vitest-environment jsdom
import React from 'react';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
const state=vi.hoisted(()=>({load:vi.fn(),save:vi.fn()}));
vi.mock('@/lib/weekly-email',()=>({loadWeeklyEmailPreference:state.load,saveWeeklyEmailPreference:state.save}));
import { EmailPreferences } from './email-preferences';
const preference={email:'alex@example.com',subscribed:true,source:'existing_default',updated_at:null};
beforeEach(()=>{state.load.mockResolvedValue(preference);state.save.mockResolvedValue({...preference,subscribed:false});});
afterEach(()=>{cleanup();vi.clearAllMocks();});
it('loads the server preference, explicitly saves off, and confirms persistence',async()=>{
 render(<EmailPreferences/>);
 const toggle=await screen.findByRole('switch');expect((toggle as HTMLInputElement).checked).toBe(true);
 fireEvent.click(toggle);fireEvent.click(screen.getByRole('button',{name:'Save preferences'}));
 await waitFor(()=>expect(state.save).toHaveBeenCalledWith(false));
 expect(await screen.findByRole('status')).toHaveProperty('textContent','Saved');
});
it('does not show a default-on switch or saved success when loading or saving fails',async()=>{
 state.load.mockRejectedValueOnce(Error('offline'));render(<EmailPreferences/>);
 await screen.findByRole('alert');expect(screen.queryByRole('switch')).toBeNull();
 fireEvent.click(screen.getByRole('button',{name:'Try again'}));const toggle=await screen.findByRole('switch');
 state.save.mockRejectedValueOnce(Error('offline'));fireEvent.click(toggle);fireEvent.click(screen.getByRole('button',{name:'Save preferences'}));
 expect((await screen.findByRole('alert')).textContent).toContain('not saved');expect(screen.queryByRole('status')).toBeNull();
});
