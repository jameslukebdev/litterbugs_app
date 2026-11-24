// @vitest-environment jsdom
import React from 'react';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, expect, it, vi } from 'vitest';
const load=vi.hoisted(()=>vi.fn());
vi.mock('@/lib/weekly-email',()=>({loadWeeklyEmailRecipients:load}));
import { WeeklyEmailList } from './weekly-email-list';
const row=(email:string,subscribed=true)=>({email,subscribed,name:'Member',source:'existing_default',updated_at:null});
afterEach(()=>{cleanup();vi.clearAllMocks();});
it('refreshes withdrawals at export time instead of exporting stale cached addresses',async()=>{
 const writeText=vi.fn().mockResolvedValue(undefined);Object.defineProperty(navigator,'clipboard',{configurable:true,value:{writeText}});
 load.mockResolvedValueOnce([row('alex@example.com'),row('sam@example.com')]).mockResolvedValueOnce([row('alex@example.com',false),row('sam@example.com')]);
 render(<WeeklyEmailList/>);await screen.findByText('alex@example.com');
 fireEvent.click(screen.getByRole('button',{name:'Copy Bcc list'}));
 await waitFor(()=>expect(writeText).toHaveBeenCalledWith('sam@example.com'));expect(load).toHaveBeenCalledTimes(2);
});
it('fails closed when a refreshed list cannot be read and requires a postal address for copying the footer',async()=>{
 load.mockResolvedValueOnce([row('alex@example.com')]).mockRejectedValueOnce(Error('session expired'));
 const writeText=vi.fn();Object.defineProperty(navigator,'clipboard',{configurable:true,value:{writeText}});
 render(<WeeklyEmailList/>);await screen.findByText('alex@example.com');
 expect((screen.getByRole('button',{name:'Copy email footer'}) as HTMLButtonElement).disabled).toBe(true);
 fireEvent.click(screen.getByRole('button',{name:'Copy Bcc list'}));await screen.findByRole('alert');expect(writeText).not.toHaveBeenCalled();
 expect((screen.getByRole('button',{name:'Copy Bcc list'}) as HTMLButtonElement).disabled).toBe(true);
});
