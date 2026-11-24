// @vitest-environment jsdom
import React from 'react';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { UnsubscribeForm } from './unsubscribe-form';
const send=vi.fn();
beforeEach(()=>{vi.stubGlobal('fetch',send);send.mockResolvedValue(new Response(JSON.stringify({ok:true}),{status:200}));});
afterEach(()=>{cleanup();vi.unstubAllGlobals();vi.clearAllMocks();});
it('only submits on confirmation and shows the same response without displaying the submitted address',async()=>{
 render(<UnsubscribeForm/>);expect(send).not.toHaveBeenCalled();
 fireEvent.change(screen.getByLabelText('Email address'),{target:{value:'alex@example.com'}});
 fireEvent.click(screen.getByRole('button',{name:'Unsubscribe'}));
 await screen.findByRole('heading',{name:'You’re unsubscribed'});
 expect(send).toHaveBeenCalledWith('/api/email/unsubscribe',expect.objectContaining({method:'POST',body:JSON.stringify({email:'alex@example.com',website:''})}));
 expect(document.body.textContent).not.toContain('alex@example.com');expect(screen.getByRole('status').textContent).toBe('You’re unsubscribed');
});
it('keeps the form retryable when the server rejects the request',async()=>{
 send.mockResolvedValueOnce(new Response('{}',{status:503}));render(<UnsubscribeForm/>);
 fireEvent.change(screen.getByLabelText('Email address'),{target:{value:'alex@example.com'}});fireEvent.click(screen.getByRole('button',{name:'Unsubscribe'}));
 expect((await screen.findByRole('alert')).textContent).toContain('could not be saved');
 expect(screen.queryByRole('heading',{name:'You’re unsubscribed'})).toBeNull();expect((screen.getByRole('button',{name:'Unsubscribe'}) as HTMLButtonElement).disabled).toBe(false);
});
