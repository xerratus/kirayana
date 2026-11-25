import {describe,it,expect,vi,afterEach} from 'vitest'
import {SaveQueue} from './saveQueue'
import {initialOrganizer} from '../organizer/model'
afterEach(()=>vi.useRealTimers())
describe('cloud save queue',()=>{
 it('coalesces pending edits and flushes on sign-out',async()=>{
  vi.useFakeTimers();const save=vi.fn(async()=>{}),status=vi.fn(),queue=new SaveQueue({load:async()=>null,save,close:()=>{}},status)
  const state=initialOrganizer();queue.enqueue(state);queue.enqueue({...state,revision:1});expect(save).not.toHaveBeenCalled();await queue.flush();expect(save).toHaveBeenCalledTimes(1);expect(save.mock.calls[0]).toEqual([{...state,revision:1}]);expect(status).toHaveBeenLastCalledWith(false,'')
 })
 it('never marks newer edits saved while a prior save is in flight',async()=>{
  let finish!:()=>void;const gate=new Promise<void>(resolve=>{finish=resolve}),status=vi.fn(),state=initialOrganizer()
  const save=vi.fn().mockImplementationOnce(()=>gate).mockResolvedValue(undefined),queue=new SaveQueue({load:async()=>null,save,close:()=>{}},status)
  queue.enqueue(state);const flush=queue.flush();queue.enqueue({...state,revision:1});finish();await flush
  expect(save.mock.calls.map(call=>call[0].revision)).toEqual([0,1]);expect(status.mock.calls.filter(call=>!call[0])).toHaveLength(1)
 })
 it('retries the identical failed snapshot before newer edits',async()=>{
  const state=initialOrganizer(),save=vi.fn().mockRejectedValueOnce(new Error('Network offline')).mockResolvedValue(undefined),status=vi.fn()
  const queue=new SaveQueue({load:async()=>null,save,close:()=>{}},status);queue.enqueue(state);await expect(queue.flush()).rejects.toThrow('not been saved')
  queue.enqueue({...state,revision:1});expect(status).toHaveBeenLastCalledWith(true,'Network offline');await queue.flush();expect(save.mock.calls.map(call=>call[0].revision)).toEqual([0,0,1])
 })
 it('cancels queued work and ignores late acknowledgements on session close',async()=>{
  let finish!:()=>void;const gate=new Promise<void>(resolve=>{finish=resolve}),status=vi.fn(),save=vi.fn(()=>gate),close=vi.fn()
  const queue=new SaveQueue({load:async()=>null,save,close},status);queue.enqueue(initialOrganizer());const flush=queue.flush();queue.enqueue(initialOrganizer());queue.close();finish();await flush;expect(save).toHaveBeenCalledTimes(1);expect(close).toHaveBeenCalledOnce();expect(status.mock.calls.every(call=>call[0])).toBe(true)
 })
})
